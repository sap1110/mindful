import intentEmbedding from './models/intent-embedding'
import intentLexical from './models/intent-lexical'
import riskEmbedding from './models/risk-embedding'
import riskLexical from './models/risk-lexical'
import { predict, predictFromVector, type Prediction, type TrainedModel } from './training/logreg'

/**
 * The trained classifiers at runtime.
 *
 * Two heads per task, fitted on the same labelled data in `training/`, and the
 * runtime picks by what the person has available rather than by preference:
 *
 *   embedding  a softmax head over sentence vectors from the Hugging Face
 *              encoder Echo downloads. Held-out macro-F1 0.90 on intent, 0.74
 *              on risk. It generalises past the training phrasings because the
 *              encoder already knows "my head feels heavy" and "I have a
 *              headache" are neighbours — the head only had to learn the
 *              boundary, not the language.
 *
 *   lexical    the same head over TF-IDF. 0.63 and 0.41. Available to
 *              everybody with nothing downloaded, and materially weaker on
 *              phrasings nobody wrote down, which is exactly what the numbers
 *              say and why they are published rather than buried.
 *
 * Neither head is ever trusted alone. `intent.ts` and `risk.ts` run their rules
 * first, and on the risk side a classifier may only ever *raise* the level —
 * see `risk.ts` for why that asymmetry is the whole safety argument.
 */

const MODELS = {
  intent: {
    embedding: intentEmbedding as unknown as TrainedModel,
    lexical: intentLexical as unknown as TrainedModel,
  },
  risk: {
    embedding: riskEmbedding as unknown as TrainedModel,
    lexical: riskLexical as unknown as TrainedModel,
  },
} as const

export type ClassifierTask = keyof typeof MODELS

export interface ClassifierResult extends Prediction {
  /** Which head answered, so the trace and the tests can tell them apart. */
  features: 'embedding' | 'lexical'
  /** The head's own held-out macro-F1, for honest confidence reporting. */
  macroF1: number
}

/**
 * Classify, preferring the embedding head when a sentence vector is available.
 *
 * The vector is the query embedding the pipeline already computes for
 * retrieval, so using the better classifier costs nothing extra — no second
 * model, no second forward pass.
 */
export function classify(
  task: ClassifierTask,
  text: string,
  vector?: Float32Array | Float64Array | null,
): ClassifierResult {
  if (vector && vector.length === MODELS[task].embedding.weights[0].length) {
    const model = MODELS[task].embedding
    return { ...predictFromVector(model, vector), features: 'embedding', macroF1: model.metrics.macroF1 }
  }

  const model = MODELS[task].lexical
  return { ...predict(model, text), features: 'lexical', macroF1: model.metrics.macroF1 }
}

/** The published metrics, for the README, the tests and the UI's honesty line. */
export function modelCard(task: ClassifierTask, features: 'embedding' | 'lexical') {
  const model = MODELS[task][features]
  return {
    task: model.task,
    features: model.features,
    encoder: model.encoder ?? null,
    classes: model.classes,
    metrics: model.metrics,
    provenance: model.provenance,
  }
}
