import { normaliseText } from '../../echo/keyword'

/**
 * Feature extraction for the trained classifiers.
 *
 * Deliberately *not* the retrieval tokenizer. Retrieval strips stopwords
 * because "how" and "should" carry no signal about which diary entry someone
 * means — but they carry a great deal about what kind of question is being
 * asked. "How much water should I drink" and "my head hurts" are separated
 * almost entirely by their function words, so this tokenizer keeps them.
 *
 * What it does keep from the retrieval side is `normaliseText`, and that
 * matters: the contraction folding that made search work equally well for
 * "cannot", "can't" and "cant" now does the same job for the classifier. A
 * model trained on tidy prose that misfires on phone typing would be a
 * fairness problem wearing a metrics table, and this is where that is
 * prevented rather than measured after the fact.
 *
 * Unigrams and bigrams, TF-IDF weighted, L2 normalised. The vocabulary is
 * explicit rather than hashed — bigger on disk, but every weight is
 * attributable to a word a person can read, which is what makes the trained
 * model explainable at prediction time instead of merely accurate.
 */

export interface Vectoriser {
  /** Feature index → the term it represents. Explicit, so weights are readable. */
  vocabulary: string[]
  /** Inverse document frequency per feature, aligned with `vocabulary`. */
  idf: number[]
}

/** Terms occurring in fewer than this many documents are dropped as noise. */
const MIN_DOCUMENT_COUNT = 2

/**
 * Unigrams plus adjacent bigrams. Bigrams are what let the model learn
 * "cannot sleep" as something different from "cannot" and "sleep" apart.
 */
export function extractTerms(text: string): string[] {
  const words = normaliseText(text.normalize('NFKC'))
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const terms = [...words]
  for (let index = 0; index < words.length - 1; index += 1) {
    terms.push(`${words[index]}_${words[index + 1]}`)
  }
  return terms
}

/** Build the vocabulary and IDF table from the training documents only. */
export function buildVectoriser(documents: readonly string[]): Vectoriser {
  const documentFrequency = new Map<string, number>()

  for (const document of documents) {
    for (const term of new Set(extractTerms(document))) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
    }
  }

  const vocabulary = [...documentFrequency.entries()]
    .filter(([, count]) => count >= MIN_DOCUMENT_COUNT)
    .map(([term]) => term)
    .sort()

  const total = documents.length
  const idf = vocabulary.map((term) => {
    const count = documentFrequency.get(term) ?? 0
    return Math.log((total + 1) / (count + 1)) + 1
  })

  return { vocabulary, idf }
}

/** Term → feature index, built once per vectoriser and cached by identity. */
const indexCache = new WeakMap<Vectoriser, Map<string, number>>()

function termIndex(vectoriser: Vectoriser): Map<string, number> {
  let index = indexCache.get(vectoriser)
  if (!index) {
    index = new Map(vectoriser.vocabulary.map((term, position) => [term, position]))
    indexCache.set(vectoriser, index)
  }
  return index
}

/**
 * One text as an L2-normalised TF-IDF vector.
 *
 * Sub-linear term frequency — log(1 + count) — so a word repeated five times
 * is worth more than once but not five times, which stops an agitated,
 * repetitive question from swamping its own signal.
 */
export function vectorise(vectoriser: Vectoriser, text: string): Float64Array {
  const index = termIndex(vectoriser)
  const vector = new Float64Array(vectoriser.vocabulary.length)

  const counts = new Map<number, number>()
  for (const term of extractTerms(text)) {
    const position = index.get(term)
    if (position === undefined) continue
    counts.set(position, (counts.get(position) ?? 0) + 1)
  }

  for (const [position, count] of counts) {
    vector[position] = Math.log(1 + count) * vectoriser.idf[position]
  }

  let norm = 0
  for (const value of vector) norm += value * value
  norm = Math.sqrt(norm)
  if (norm > 0) {
    for (let position = 0; position < vector.length; position += 1) vector[position] /= norm
  }

  return vector
}
