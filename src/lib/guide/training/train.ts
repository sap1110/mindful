import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from '@huggingface/transformers'
import { buildVectoriser, vectorise } from './features'
import {
  fit,
  scoreClassification,
  shuffled,
  type ModelMetrics,
  type TrainedModel,
} from './logreg'
import { INTENT_CLASSES, RISK_CLASSES, TRAINING_DATA, type LabelledExample } from './dataset'

/**
 * The training script. `npm run train`.
 *
 * Fits two classifiers per task, from the same labelled data:
 *
 *   **embedding** — a softmax head over sentence embeddings from
 *   `Xenova/all-MiniLM-L6-v2`, the same Hugging Face model Echo already uses.
 *   This is ordinary transfer learning, and it is the reason the classifier
 *   generalises past the phrasings in `dataset.ts`: the pretrained encoder
 *   already knows that "my head feels heavy" and "I have a headache" live near
 *   each other, so a few hundred labelled examples only have to teach the
 *   decision boundary, not the language. 384 features, ~3.5k weights, ~15KB.
 *
 *   **lexical** — the same head over TF-IDF features, for the path where no
 *   model has been downloaded. Weaker on unseen phrasing by construction, and
 *   the metrics below say by how much rather than leaving it to be assumed.
 *
 * The embedding model is downloaded once *here*, on a developer machine, at
 * build time. Nothing about training reaches a user: they receive a few
 * kilobytes of learned weights, and the runtime uses the embedding head only if
 * they have separately consented to the model download for Echo.
 *
 * Everything is deterministic — seeded split, seeded shuffle, fixed epochs — so
 * re-running reproduces the committed artefacts and a diff means the data or
 * the hyperparameters changed.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const OUTPUT = join(HERE, '..', 'models')

const SEED = 20260814
const TEST_FRACTION = 0.25
const FOLDS = 5
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'

const PROVENANCE =
  'Trained on hand-authored examples written for this project — not on any real user data, and not on anything typed into this app. See src/lib/guide/training/dataset.ts for the full statement of what that limits.'

type Task = 'intent' | 'risk'
type Features = 'embedding' | 'lexical'

function labelOf(example: LabelledExample, task: Task): string {
  return task === 'intent' ? example.intent : example.risk
}

/** Stratified split: every class keeps its proportions on both sides. */
function stratifiedSplit(
  examples: readonly LabelledExample[],
  task: Task,
): { train: LabelledExample[]; test: LabelledExample[] } {
  const byClass = new Map<string, LabelledExample[]>()
  for (const example of examples) {
    const label = labelOf(example, task)
    byClass.set(label, [...(byClass.get(label) ?? []), example])
  }

  const train: LabelledExample[] = []
  const test: LabelledExample[] = []

  for (const [label, group] of [...byClass.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const order = shuffled(group, SEED + label.length)
    const testCount = Math.max(1, Math.round(order.length * TEST_FRACTION))
    test.push(...order.slice(0, testCount))
    train.push(...order.slice(testCount))
  }

  return { train: shuffled(train, SEED), test: shuffled(test, SEED + 1) }
}

function predictIndex(vector: Float64Array, weights: number[][], bias: number[]): number {
  let best = 0
  let bestScore = -Infinity
  for (let klass = 0; klass < weights.length; klass += 1) {
    let score = bias[klass]
    for (let feature = 0; feature < vector.length; feature += 1) {
      if (vector[feature] !== 0) score += weights[klass][feature] * vector[feature]
    }
    if (score > bestScore) {
      bestScore = score
      best = klass
    }
  }
  return best
}

function round(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/* ------------------------------------------------------------- embeddings */

/** Embed every training sentence once, on this machine, at build time. */
async function embedAll(texts: readonly string[]): Promise<Map<string, Float64Array>> {
  console.log(`Loading ${MODEL_ID} (first run downloads it, then it is cached)…`)
  const extractor = await pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' })

  const vectors = new Map<string, Float64Array>()
  const BATCH = 32

  for (let start = 0; start < texts.length; start += BATCH) {
    const batch = texts.slice(start, start + BATCH)
    const output = await extractor(batch as string[], { pooling: 'mean', normalize: true })
    const flat = output.data as Float32Array
    const dimension = flat.length / batch.length

    batch.forEach((text, index) => {
      vectors.set(text, Float64Array.from(flat.slice(index * dimension, (index + 1) * dimension)))
    })
    process.stdout.write(`  embedded ${Math.min(start + BATCH, texts.length)}/${texts.length}\r`)
  }

  console.log('')
  return vectors
}

/* --------------------------------------------------------------- training */

interface Fitted {
  model: TrainedModel
  metrics: ModelMetrics
}

function trainLexical(
  train: readonly LabelledExample[],
  test: readonly LabelledExample[],
  classes: readonly string[],
  task: Task,
): Fitted {
  // Vocabulary from the training half only — no leakage from the held-out set.
  const vectoriser = buildVectoriser(train.map((example) => example.text))
  const featureCount = vectoriser.vocabulary.length

  const encode = (subset: readonly LabelledExample[]) => ({
    vectors: subset.map((example) => vectorise(vectoriser, example.text)),
    labels: subset.map((example) => classes.indexOf(labelOf(example, task))),
  })

  const trainSet = encode(train)
  const testSet = encode(test)
  const { weights, bias } = fit(trainSet.vectors, trainSet.labels, classes.length, featureCount)

  const predictions = testSet.vectors.map((vector) => predictIndex(vector, weights, bias))
  const core = scoreClassification(testSet.labels, predictions, classes)

  const foldScores: number[] = []
  for (let fold = 0; fold < FOLDS; fold += 1) {
    const holdout = train.filter((_, index) => index % FOLDS === fold)
    const rest = train.filter((_, index) => index % FOLDS !== fold)
    if (holdout.length === 0 || rest.length === 0) continue

    const foldVectoriser = buildVectoriser(rest.map((example) => example.text))
    const foldFit = fit(
      rest.map((example) => vectorise(foldVectoriser, example.text)),
      rest.map((example) => classes.indexOf(labelOf(example, task))),
      classes.length,
      foldVectoriser.vocabulary.length,
    )
    const foldPredictions = holdout.map((example) =>
      predictIndex(vectorise(foldVectoriser, example.text), foldFit.weights, foldFit.bias),
    )
    foldScores.push(
      scoreClassification(
        holdout.map((example) => classes.indexOf(labelOf(example, task))),
        foldPredictions,
        classes,
      ).macroF1,
    )
  }

  const metrics: ModelMetrics = {
    ...core,
    trainedOn: train.length,
    heldOut: test.length,
    crossValidationF1: mean(foldScores),
  }

  return {
    metrics,
    model: {
      version: 1,
      task,
      features: 'lexical',
      classes: [...classes],
      vectoriser: {
        vocabulary: vectoriser.vocabulary,
        idf: vectoriser.idf.map((value) => round(value, 4)),
      },
      weights: weights.map((row) => row.map((value) => round(value, 4))),
      bias: bias.map((value) => round(value, 4)),
      metrics,
      provenance: PROVENANCE,
    },
  }
}

function trainEmbedding(
  train: readonly LabelledExample[],
  test: readonly LabelledExample[],
  classes: readonly string[],
  task: Task,
  embeddings: Map<string, Float64Array>,
): Fitted {
  const vectorOf = (example: LabelledExample) => embeddings.get(example.text)!
  const labelIndex = (example: LabelledExample) => classes.indexOf(labelOf(example, task))
  const featureCount = vectorOf(train[0]).length

  const { weights, bias } = fit(
    train.map(vectorOf),
    train.map(labelIndex),
    classes.length,
    featureCount,
    // Dense, unit-length features take a gentler rate than sparse TF-IDF.
    { epochs: 4000, learningRate: 6, l2: 0.0004 },
  )

  const predictions = test.map((example) => predictIndex(vectorOf(example), weights, bias))
  const core = scoreClassification(test.map(labelIndex), predictions, classes)

  const foldScores: number[] = []
  for (let fold = 0; fold < FOLDS; fold += 1) {
    const holdout = train.filter((_, index) => index % FOLDS === fold)
    const rest = train.filter((_, index) => index % FOLDS !== fold)
    if (holdout.length === 0 || rest.length === 0) continue

    const foldFit = fit(rest.map(vectorOf), rest.map(labelIndex), classes.length, featureCount, {
      epochs: 4000,
      learningRate: 6,
      l2: 0.0004,
    })
    const foldPredictions = holdout.map((example) =>
      predictIndex(vectorOf(example), foldFit.weights, foldFit.bias),
    )
    foldScores.push(
      scoreClassification(holdout.map(labelIndex), foldPredictions, classes).macroF1,
    )
  }

  const metrics: ModelMetrics = {
    ...core,
    trainedOn: train.length,
    heldOut: test.length,
    crossValidationF1: mean(foldScores),
  }

  return {
    metrics,
    model: {
      version: 1,
      task,
      features: 'embedding',
      encoder: MODEL_ID,
      classes: [...classes],
      weights: weights.map((row) => row.map((value) => round(value, 5))),
      bias: bias.map((value) => round(value, 5)),
      metrics,
      provenance: PROVENANCE,
    },
  }
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length
}

function formatReport(
  task: string,
  features: Features,
  metrics: ModelMetrics,
  classes: readonly string[],
): string {
  const title = `${task} · ${features}`
  const lines: string[] = []
  lines.push(`\n── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`)
  lines.push(
    `trained on ${metrics.trainedOn}, held out ${metrics.heldOut}   ` +
      `macro-F1 ${metrics.macroF1.toFixed(3)}   accuracy ${metrics.accuracy.toFixed(3)}   ` +
      `${FOLDS}-fold CV F1 ${metrics.crossValidationF1.toFixed(3)}`,
  )
  lines.push('')
  lines.push('  class                  precision  recall   f1   support')
  for (const entry of metrics.perClass) {
    lines.push(
      `  ${entry.label.padEnd(22)} ${entry.precision.toFixed(2).padStart(8)} ` +
        `${entry.recall.toFixed(2).padStart(7)} ${entry.f1.toFixed(2).padStart(5)} ` +
        `${String(entry.support).padStart(9)}`,
    )
  }
  lines.push('')
  lines.push('  confusion (rows = actual, columns = predicted)')
  lines.push(`  ${''.padEnd(22)}${classes.map((label) => label.slice(0, 5).padStart(6)).join('')}`)
  metrics.confusion.forEach((row, index) => {
    lines.push(
      `  ${classes[index].padEnd(22)}${row.map((value) => String(value).padStart(6)).join('')}`,
    )
  })
  return lines.join('\n')
}

/* ------------------------------------------------------------------- run */

const embeddings = await embedAll(TRAINING_DATA.map((example) => example.text))

console.log(`\nTraining set: ${TRAINING_DATA.length} labelled examples`)

for (const [task, classes] of [
  ['intent', INTENT_CLASSES],
  ['risk', RISK_CLASSES],
] as const) {
  const { train, test } = stratifiedSplit(TRAINING_DATA, task)

  const embedding = trainEmbedding(train, test, classes, task, embeddings)
  const lexical = trainLexical(train, test, classes, task)

  console.log(formatReport(task, 'embedding', embedding.metrics, classes))
  console.log(formatReport(task, 'lexical', lexical.metrics, classes))

  writeFileSync(join(OUTPUT, `${task}-embedding.json`), `${JSON.stringify(embedding.model)}\n`)
  writeFileSync(join(OUTPUT, `${task}-lexical.json`), `${JSON.stringify(lexical.model)}\n`)
}

console.log(`\nWrote four model artefacts to ${OUTPUT}\n`)
