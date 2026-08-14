import type { Vectoriser } from './features'
import { vectorise } from './features'

/**
 * Multinomial logistic regression, trained by gradient descent.
 *
 * Chosen over anything deeper for reasons that are about this product rather
 * than about fashion. With a few hundred hand-authored examples, a model with
 * more capacity learns the author's phrasing rather than the classes. Softmax
 * regression is convex — the same data gives the same weights, every run, on
 * every machine, so the artefact committed to the repository is reproducible
 * rather than a lucky seed. And each weight belongs to one readable term,
 * which is what lets a prediction explain itself with the words that drove it
 * instead of a saliency map nobody can check.
 *
 * Everything is deterministic: a seeded shuffle, fixed epochs, no dropout.
 * `npm run train` twice produces byte-identical output.
 */

export interface TrainedModel {
  version: 1
  task: string
  /**
   * Which feature space this head was fitted in. `embedding` heads take the
   * sentence vector from the Hugging Face encoder; `lexical` heads carry their
   * own vocabulary and take TF-IDF. The two are not interchangeable, so the
   * runtime picks by this field rather than by convention.
   */
  features: 'embedding' | 'lexical'
  /** The encoder an embedding head was fitted against. Absent for lexical. */
  encoder?: string
  classes: string[]
  /** Present only for lexical heads. */
  vectoriser?: Vectoriser
  /** classes × features. */
  weights: number[][]
  bias: number[]
  metrics: ModelMetrics
  /** Recorded in the artefact so the limitation travels with the model. */
  provenance: string
}

export interface ClassMetrics {
  label: string
  precision: number
  recall: number
  f1: number
  support: number
}

export interface ModelMetrics {
  trainedOn: number
  heldOut: number
  /** Mean over classes — the honest headline when classes are imbalanced. */
  macroF1: number
  accuracy: number
  perClass: ClassMetrics[]
  /** confusion[actual][predicted]. */
  confusion: number[][]
  /** Mean macro-F1 across k folds on the training portion. */
  crossValidationF1: number
}

export interface TrainOptions {
  epochs?: number
  learningRate?: number
  /** L2 penalty. The main defence against memorising a small dataset. */
  l2?: number
  /**
   * Weight each example by the inverse frequency of its class.
   *
   * Without this the first trained model scored 0.00 F1 on medication,
   * out-of-scope, unclear and — most seriously — high risk, because predicting
   * "symptom, low" for everything is locally optimal when those classes
   * dominate the data. A classifier that never fires on the rarest class is
   * useless precisely where the rarest class is the dangerous one.
   */
  balanceClasses?: boolean
}

const DEFAULTS = { epochs: 2500, learningRate: 3, l2: 0.0008, balanceClasses: true }

/** Deterministic PRNG, so the shuffle is reproducible across machines. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const random = mulberry32(seed)
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function softmax(scores: number[]): number[] {
  const peak = Math.max(...scores)
  const exponentials = scores.map((score) => Math.exp(score - peak))
  const total = exponentials.reduce((sum, value) => sum + value, 0)
  return exponentials.map((value) => value / total)
}

export interface FittedWeights {
  weights: number[][]
  bias: number[]
}

/** Full-batch gradient descent on the cross-entropy loss. */
export function fit(
  vectors: readonly Float64Array[],
  labels: readonly number[],
  classCount: number,
  featureCount: number,
  options: TrainOptions = {},
): FittedWeights {
  const { epochs, learningRate, l2, balanceClasses } = { ...DEFAULTS, ...options }

  const weights = Array.from({ length: classCount }, () => new Array<number>(featureCount).fill(0))
  const bias = new Array<number>(classCount).fill(0)
  const samples = vectors.length
  if (samples === 0) return { weights, bias }

  // Inverse-frequency weights, normalised so the effective sample size — and
  // therefore the useful learning rate — stays comparable to the unweighted run.
  const counts = new Array<number>(classCount).fill(0)
  for (const label of labels) counts[label] += 1
  const classWeight = counts.map((count) =>
    !balanceClasses || count === 0 ? 1 : samples / (classCount * count),
  )
  const weightTotal = labels.reduce((total, label) => total + classWeight[label], 0)

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const weightGradient = Array.from({ length: classCount }, () =>
      new Array<number>(featureCount).fill(0),
    )
    const biasGradient = new Array<number>(classCount).fill(0)

    for (let sample = 0; sample < samples; sample += 1) {
      const vector = vectors[sample]
      const scores = new Array<number>(classCount)
      for (let klass = 0; klass < classCount; klass += 1) {
        let score = bias[klass]
        const row = weights[klass]
        for (let feature = 0; feature < featureCount; feature += 1) {
          if (vector[feature] !== 0) score += row[feature] * vector[feature]
        }
        scores[klass] = score
      }

      const probabilities = softmax(scores)
      const sampleWeight = classWeight[labels[sample]]
      for (let klass = 0; klass < classCount; klass += 1) {
        const error = (probabilities[klass] - (labels[sample] === klass ? 1 : 0)) * sampleWeight
        if (error === 0) continue
        biasGradient[klass] += error
        const row = weightGradient[klass]
        for (let feature = 0; feature < featureCount; feature += 1) {
          if (vector[feature] !== 0) row[feature] += error * vector[feature]
        }
      }
    }

    for (let klass = 0; klass < classCount; klass += 1) {
      bias[klass] -= (learningRate * biasGradient[klass]) / weightTotal
      const row = weights[klass]
      const gradientRow = weightGradient[klass]
      for (let feature = 0; feature < featureCount; feature += 1) {
        row[feature] -= learningRate * (gradientRow[feature] / weightTotal + l2 * row[feature])
      }
    }
  }

  return { weights, bias }
}

export interface Prediction {
  label: string
  confidence: number
  probabilities: { label: string; probability: number }[]
  /** The terms that pushed hardest towards the winning class. */
  topFeatures: { term: string; weight: number }[]
}

/**
 * Predict, and say why.
 *
 * `topFeatures` is the explainability the PRD asks for and the one an
 * extractive system can honestly give: these are the actual words in the
 * question, multiplied by the actual learned weights, sorted. Not a
 * post-hoc story about the model — the arithmetic that produced the answer.
 */
export function predict(model: TrainedModel, text: string): Prediction {
  if (!model.vectoriser) {
    throw new Error('predict() takes a lexical model; use predictFromVector for embedding heads')
  }
  const vector = vectorise(model.vectoriser, text)

  const scores = model.classes.map((_, klass) => {
    let score = model.bias[klass]
    const row = model.weights[klass]
    for (let feature = 0; feature < vector.length; feature += 1) {
      if (vector[feature] !== 0) score += row[feature] * vector[feature]
    }
    return score
  })

  const probabilities = softmax(scores)
  let best = 0
  for (let klass = 1; klass < probabilities.length; klass += 1) {
    if (probabilities[klass] > probabilities[best]) best = klass
  }

  const winningRow = model.weights[best]
  const contributions: { term: string; weight: number }[] = []
  for (let feature = 0; feature < vector.length; feature += 1) {
    if (vector[feature] === 0) continue
    const contribution = winningRow[feature] * vector[feature]
    if (contribution > 0) {
      contributions.push({ term: model.vectoriser.vocabulary[feature], weight: contribution })
    }
  }
  contributions.sort((a, b) => b.weight - a.weight)

  return {
    label: model.classes[best],
    confidence: probabilities[best],
    probabilities: model.classes.map((label, klass) => ({
      label,
      probability: probabilities[klass],
    })),
    topFeatures: contributions.slice(0, 4),
  }
}

/**
 * Predict from a vector that was produced elsewhere — the embedding path,
 * where the features come from the Hugging Face encoder rather than from a
 * vocabulary this model owns.
 *
 * No `topFeatures`: the dimensions of a sentence embedding are not words, and
 * inventing labels for them would be exactly the kind of plausible-sounding
 * explanation this codebase refuses to produce. Explanation on this path comes
 * from the retrieved evidence instead, which is real.
 */
export function predictFromVector(
  model: TrainedModel,
  vector: Float32Array | Float64Array,
): Prediction {
  const scores = model.classes.map((_, klass) => {
    let score = model.bias[klass]
    const row = model.weights[klass]
    for (let feature = 0; feature < vector.length; feature += 1) {
      score += row[feature] * vector[feature]
    }
    return score
  })

  const probabilities = softmax(scores)
  let best = 0
  for (let klass = 1; klass < probabilities.length; klass += 1) {
    if (probabilities[klass] > probabilities[best]) best = klass
  }

  return {
    label: model.classes[best],
    confidence: probabilities[best],
    probabilities: model.classes.map((label, klass) => ({
      label,
      probability: probabilities[klass],
    })),
    topFeatures: [],
  }
}

/* --------------------------------------------------------------- metrics */

export function scoreClassification(
  actual: readonly number[],
  predicted: readonly number[],
  classes: readonly string[],
): Omit<ModelMetrics, 'trainedOn' | 'heldOut' | 'crossValidationF1'> {
  const confusion = Array.from({ length: classes.length }, () =>
    new Array<number>(classes.length).fill(0),
  )
  for (let index = 0; index < actual.length; index += 1) {
    confusion[actual[index]][predicted[index]] += 1
  }

  const perClass: ClassMetrics[] = classes.map((label, klass) => {
    const truePositives = confusion[klass][klass]
    const predictedPositives = confusion.reduce((total, row) => total + row[klass], 0)
    const actualPositives = confusion[klass].reduce((total, value) => total + value, 0)

    const precision = predictedPositives === 0 ? 0 : truePositives / predictedPositives
    const recall = actualPositives === 0 ? 0 : truePositives / actualPositives
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)

    return { label, precision, recall, f1, support: actualPositives }
  })

  // Macro-F1 over classes that actually appear, so an absent class does not
  // silently drag the headline number down.
  const present = perClass.filter((entry) => entry.support > 0)
  const macroF1 =
    present.length === 0 ? 0 : present.reduce((total, entry) => total + entry.f1, 0) / present.length

  const correct = actual.filter((value, index) => value === predicted[index]).length
  const accuracy = actual.length === 0 ? 0 : correct / actual.length

  return { macroF1, accuracy, perClass, confusion }
}
