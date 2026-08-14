import { normaliseText, tokenize } from '../echo/keyword'
import { classify } from './classifier'

/**
 * Health intent classification — PRD §8.
 *
 * Rules first, similarity second, "unclear" as a first-class answer.
 *
 * The two intents where being wrong is expensive — medication questions and
 * requests for a diagnosis — are detected by explicit patterns, because a
 * similarity classifier that is 92% right is 8% wrong about exactly the cases
 * that must never fall through. Everything else is scored by lexical
 * similarity against a bank of prototype phrasings per intent (upgraded to
 * embedding similarity when the on-device model is loaded), and a query whose
 * best score is weak or ambiguous is classified `unclear` rather than
 * force-fitted — the pipeline turns `unclear` into a clarifying question, per
 * the PRD's own "prefer asking for clarification" rule.
 *
 * The classifier is a pure function over text. It can be evaluated in Node,
 * per intent, with no browser and no model, which is what makes its error
 * rate a number instead of an anecdote.
 */

export type HealthIntent =
  | 'symptom'
  | 'general-health'
  | 'recovery'
  | 'medication'
  | 'mental-health'
  | 'preventive'
  | 'diagnosis-explanation'
  | 'out-of-scope'
  | 'unclear'

export interface IntentResult {
  intent: HealthIntent
  /** Softmax probability of the winning class, or 1 when a rule decided. */
  confidence: number
  /** Which rule fired, when one did. Null for a trained classification. */
  rule: string | null
  /** Which head answered — absent when a rule decided it. */
  features?: 'embedding' | 'lexical'
  /** Terms that drove a lexical classification, for the trace. */
  evidence?: string[]
}

/**
 * Requests Mindful must not serve, however fluently it could pretend to:
 * naming someone's condition, medication specifics, and instructions to act
 * against professional advice. Detected by pattern so they cannot be
 * out-scored by a friendly-looking similarity match.
 */
const OUT_OF_SCOPE_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['diagnose-me', /\b(diagnose\s+me|what\s+(disease|condition|illness)\s+do\s+i\s+have|do\s+i\s+have\s+(cancer|diabetes|adhd|autism|bipolar|schizophrenia|lupus|ms\b))/i],
  ['tell-me-what-i-have', /\btell\s+me\s+(exactly\s+)?what('?s| is)?\s+wrong\s+with\s+me\b/i],
  ['prescribe', /\b(prescribe|write\s+me\s+a\s+prescription|which\s+antibiotic)\b/i],
  ['against-advice', /\b(without\s+(telling|asking)\s+(my|a)\s+(doctor|gp)|instead\s+of\s+(seeing|going\s+to)\s+(a|the|my)\s+(doctor|gp))\b/i],
]

/** Medication specifics: routed to their own careful lane, never answered. */
const MEDICATION_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['dose', /\b(dose|dosage|how\s+(much|many)\s+(mg|ml|milligrams?|tablets?|pills?)|\d+\s?(mg|ml)\b)/i],
  ['interactions', /\b(mix|combine|interact|together)\b.*\b(medicine|medication|meds|pills?|tablets?|ibuprofen|paracetamol|acetaminophen|aspirin|antidepressants?)\b/i],
  ['start-stop', /\b(stop|quit|come\s+off|start|double)\b.*\b(taking\s+)?(my\s+)?(medication|medicine|meds|antidepressants?|prescription)\b/i],
  ['named-drug-question', /\b(ibuprofen|paracetamol|acetaminophen|aspirin|melatonin|sertraline|fluoxetine|citalopram)\b/i],
]

/**
 * Confidence floors for the trained head.
 *
 * The embedding head is materially better (held-out macro-F1 0.90 against
 * 0.63), so the lexical path is held to a higher bar before it is allowed to
 * commit to a class — a weaker classifier should ask more often, not guess
 * more often. Below the floor the answer is `unclear`, which the pipeline
 * turns into a clarifying question.
 */
const MIN_CONFIDENCE = { embedding: 0.34, lexical: 0.42 } as const

/** Fewer content words than this and there is nothing to classify — ask instead. */
const MIN_QUERY_TOKENS = 2

export function classifyIntent(
  text: string,
  vector?: Float32Array | Float64Array | null,
): IntentResult {
  const normalised = normaliseText(text.normalize('NFKC'))

  // Rules first, and they win. These are the two lanes where a probabilistic
  // answer is not good enough: naming someone's condition, and anything about
  // doses. A classifier at 0.90 is wrong one time in ten, and one time in ten
  // is not an acceptable rate for either of them.
  for (const [rule, pattern] of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(normalised)) return { intent: 'out-of-scope', confidence: 1, rule }
  }

  for (const [rule, pattern] of MEDICATION_PATTERNS) {
    if (pattern.test(normalised)) return { intent: 'medication', confidence: 1, rule }
  }

  // A single content word carries nothing to classify.
  if (tokenize(text).size < MIN_QUERY_TOKENS) {
    return { intent: 'unclear', confidence: 0, rule: 'too-short' }
  }

  const prediction = classify('intent', text, vector)
  const floor = MIN_CONFIDENCE[prediction.features]

  if (prediction.confidence < floor) {
    return {
      intent: 'unclear',
      confidence: prediction.confidence,
      rule: null,
      features: prediction.features,
    }
  }

  return {
    intent: prediction.label as HealthIntent,
    confidence: prediction.confidence,
    rule: null,
    features: prediction.features,
    /** The words that drove it, when the lexical head answered. */
    evidence: prediction.topFeatures.map((entry) => entry.term),
  }
}
