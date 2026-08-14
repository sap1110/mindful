import {
  bm25Ranking,
  buildLexicalIndex,
  normaliseText,
  tokenList,
  tokenize,
  type LexicalIndex,
} from '../echo/keyword'

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
  /** 0-1: how much better the winner scored than "no idea". */
  confidence: number
  /** Which rule fired, when one did. Null for similarity classifications. */
  rule: string | null
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
 * Prototype phrasings per intent. These are the classifier: a query is scored
 * by lexical overlap against each bank, and the best bank wins if it wins
 * clearly. Kept in everyday register for the same reason the evidence cues
 * are — this is the language the classifier will actually meet.
 */
const PROTOTYPES: Readonly<Record<Exclude<HealthIntent, 'medication' | 'out-of-scope' | 'unclear'>, readonly string[]>> = {
  symptom: [
    'I have a headache and feel sick',
    'my back hurts when I bend over',
    'I keep feeling dizzy when I stand up',
    'I have had a fever for two days',
    'my throat is sore and I am coughing',
    'why does my head hurt',
    'I feel tired all the time lately',
    'I have not been sleeping well and feel exhausted during the day',
    'my stomach has been hurting since yesterday',
  ],
  'general-health': [
    'how much water should I drink a day',
    'what is a normal temperature',
    'how many hours of sleep do adults need',
    'is coffee bad for you',
    'what counts as a fever',
    'how long does a cold usually last',
  ],
  recovery: [
    'how do I recover from a concussion',
    'getting back to sport after a head injury',
    'how long until I can go back to work after being ill',
    'returning to school after concussion',
    'when can I exercise again after being sick',
  ],
  'mental-health': [
    'I have been feeling anxious all week',
    'I think I might be depressed',
    'how do I deal with stress',
    'my mind will not stop racing',
    'I feel overwhelmed and low',
    'how can I calm down when panicking',
  ],
  preventive: [
    'how much exercise should I be doing',
    'how do I improve my sleep routine',
    'what can I do to stay healthy',
    'tips for building better habits',
    'how do I prevent getting headaches',
  ],
  'diagnosis-explanation': [
    'what does a concussion actually mean',
    'my doctor said I have migraine what is that',
    'I was diagnosed with anxiety what does it mean',
    'can you explain what a diagnosis of insomnia means',
    'what happens in the brain during a concussion',
  ],
}

/**
 * BM25 over the prototype bank, built once. IDF is the point: an early version
 * scored prototypes by plain token overlap, and the evaluation set caught it
 * classifying "headaches after long days at work" as *recovery* — because
 * "long", "after" and "work" counted as much as "headache". Under BM25 a term
 * is worth what it discriminates, which is what a classifier's features are
 * supposed to be.
 */
let prototypeIndex: LexicalIndex | null = null

function getPrototypeIndex(): LexicalIndex {
  if (!prototypeIndex) {
    prototypeIndex = buildLexicalIndex(
      (Object.entries(PROTOTYPES) as [HealthIntent, readonly string[]][]).flatMap(
        ([intent, examples]) => examples.map((text, index) => ({ id: `${intent}#${index}`, text })),
      ),
    )
  }
  return prototypeIndex
}

/** A winner below this BM25 score has matched nothing but common words. */
const MIN_SCORE = 1.2
/** The winner must beat the best *differently-routed* intent by this ratio. */
const MIN_MARGIN_RATIO = 1.2

/** Fewer content words than this and there is nothing to classify — ask instead. */
const MIN_QUERY_TOKENS = 3

/**
 * Intents whose downstream handling differs. A margin collision between two
 * intents in the same class ("preventive vs recovery") changes nothing but a
 * template, so it is resolved in favour of the best score; a collision across
 * classes ("symptom vs preventive") changes the routing, so it stays honest
 * and resolves to `unclear`.
 */
function routingClass(intent: HealthIntent): 'symptom' | 'informational' {
  return intent === 'symptom' ? 'symptom' : 'informational'
}

export function classifyIntent(text: string): IntentResult {
  const normalised = normaliseText(text.normalize('NFKC'))

  for (const [rule, pattern] of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(normalised)) return { intent: 'out-of-scope', confidence: 1, rule }
  }

  for (const [rule, pattern] of MEDICATION_PATTERNS) {
    if (pattern.test(normalised)) return { intent: 'medication', confidence: 1, rule }
  }

  // "it hurts" carries one content word. Any classification of it would be a
  // guess wearing a label, so it goes to clarification instead.
  if (tokenize(text).size < MIN_QUERY_TOKENS) {
    return { intent: 'unclear', confidence: 0, rule: 'too-short' }
  }

  const ranking = bm25Ranking(getPrototypeIndex(), tokenList(text))

  // Best prototype per intent, best first across intents.
  const bestPerIntent = new Map<HealthIntent, number>()
  for (const entry of ranking) {
    const intent = entry.id.split('#')[0] as HealthIntent
    if (!bestPerIntent.has(intent)) bestPerIntent.set(intent, entry.score)
  }

  const scores = [...bestPerIntent.entries()]
    .map(([intent, score]) => ({ intent, score }))
    .sort((a, b) => b.score - a.score)

  const best = scores[0]
  if (!best || best.score < MIN_SCORE) {
    return { intent: 'unclear', confidence: best?.score ?? 0, rule: null }
  }

  const rival = scores.find(
    (entry) => routingClass(entry.intent) !== routingClass(best.intent),
  )
  if (rival && best.score < rival.score * MIN_MARGIN_RATIO) {
    return { intent: 'unclear', confidence: best.score, rule: 'route-ambiguous' }
  }

  // Squash an unbounded BM25 score into 0-1 for the confidence meter.
  return { intent: best.intent, confidence: best.score / (best.score + 2), rule: null }
}
