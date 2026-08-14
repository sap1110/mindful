import { normaliseText } from '../echo/keyword'
import { assessRisk } from '../echo/safety'

/**
 * Risk classification — PRD §9.
 *
 * Four levels, biased conservative. The job of this layer is not to be a
 * triage nurse — it is to make sure the pipeline never composes a friendly
 * educational answer over the top of an emergency.
 *
 *   HIGH      the question describes a recognised emergency pattern; the
 *             pipeline skips retrieval and answers with escalation only.
 *   MODERATE  wrong guidance could plausibly cause harm — persistent or
 *             worsening symptoms, anything involving a baby, anything the
 *             person says is severe. Answered, with professional care leading.
 *   LOW       general educational ground.
 *   UNKNOWN   too little information to place it, which resolves to a
 *             clarifying question rather than a guess.
 *
 * The emergency patterns are the ones public-health bodies publish for the
 * public (NHS/CDC emergency lists): chest pain, stroke signs, anaphylaxis,
 * meningitis signs, thunderclap headache, uncontrolled bleeding, the
 * cauda-equina back-pain combination, infant fever, and the concussion danger
 * signs. Mental-health crisis is delegated to the existing crisis guard,
 * which has its own, wider language model of how distress is typed.
 *
 * Like everything in this folder it is a pure function over text: testable in
 * Node, level by level, with escalation recall as a number in CI.
 */

export type RiskLevel = 'low' | 'moderate' | 'high' | 'unknown'

export interface GuideRisk {
  level: RiskLevel
  /** Which pattern fired, for tests and the trace. Never shown as a verdict. */
  matched: string | null
  /** The mental-health crisis guard fired — route to crisis support, not A&E copy. */
  crisis: boolean
}

/** Emergency patterns, in the language people type them. Any one is enough. */
const HIGH_RISK_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['chest-pain', /\b(chest\s+(pain|pressure|tightness)|pain\s+(spreading|radiating)\s+to\s+(my\s+)?(arm|jaw|neck))\b/i],
  ['breathing', /\b(cannot|can\s?not|struggling\s+to|hard\s+to)\s+breathe\b|\bshort(ness)?\s+of\s+breath\b.*\b(sudden|severe|worse)\b/i],
  ['stroke-signs', /\b(face\s+(droop|drooping)|slurr(ed|ing)\s+speech|(cannot|can\s?not)\s+(lift|move|feel)\s+(my\s+)?(arm|leg|one\s+side)|weak(ness)?\s+on\s+one\s+side)\b/i],
  ['anaphylaxis', /\b(throat|tongue|lips?)\s+(is\s+|are\s+)?(swelling|closing)\b|\ballergic\s+reaction\b.*\b(breath|swell)/i],
  ['thunderclap', /\b(worst\s+headache\s+of\s+my\s+life|headache\b.*\b(sudden(ly)?|out\s+of\s+nowhere)\b.*\b(severe|extreme|unbearable))/i],
  ['meningitis', /\b(stiff\s+neck)\b.*\b(fever|temperature|rash)\b|\brash\b.*\b(does\s?n[o']?t|doesnt|wont|will\s+not)\s+fade\b/i],
  ['bleeding', /\bbleeding\b.*\b(will\s+not|wont|does\s?n[o']?t|doesnt|cannot)\s+stop\b|\bcoughing\s+(up\s+)?blood\b/i],
  ['seizure-now', /\b(having|had)\s+a\s+seizure\b|\bconvulsions?\b/i],
  ['cauda-equina', /\bback\s+pain\b.*\b(numb(ness)?\s+(around|between|in)\s+(my\s+)?(groin|genitals|buttocks|saddle)|(cannot|can\s?not|lost)\s+control(ling)?\s+(of\s+)?(my\s+)?(bladder|bowels?))/i],
  ['infant-fever', /\b(baby|newborn|infant)\b.*\b(fever|temperature|38)\b|\b(under|younger\s+than)\s+(3|three)\s+months?\b.*\bfever\b/i],
  ['head-injury-signs', /\b(hit|banged|injured)\b.*\bhead\b.*\b(vomit|confus|drowsy|(cannot|can\s?not)\s+wake|one\s+pupil|slurr)/i],
  ['unconscious', /\b(passed\s+out|unconscious|fainted\s+and\s+(hit|injured))\b/i],
  ['poisoning', /\b(swallowed|drank|took)\b.*\b(bleach|poison|too\s+many\s+(pills|tablets))\b/i],
]

/** Not an emergency on its face, but not ground to be breezy on either. */
const MODERATE_RISK_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['persistent', /\b(for|over|more\s+than)\s+(a\s+)?(week|weeks|month|months|fortnight|[2-9]\s+weeks)\b/i],
  ['worsening', /\b(getting|keeps?\s+getting|got)\s+(worse|more\s+painful|more\s+frequent)\b/i],
  ['severe-language', /\b(severe|unbearable|excruciating|agonising|agonizing|worst)\b/i],
  ['recurring', /\b(keeps?\s+(coming\s+back|happening|returning)|every\s+(day|night)\s+for)\b/i],
  ['child', /\b(my\s+)?(baby|toddler|child|kid|son|daughter)\b/i],
  ['pregnancy', /\b(pregnant|pregnancy)\b/i],
  ['existing-condition', /\b(heart\s+condition|diabetes|diabetic|epilep(sy|tic)|immunocompromised|chemotherapy)\b/i],
]

/** The moderate patterns need some symptom context before they mean anything. */
const SYMPTOM_CONTEXT = /\b(pain|ache|aching|hurt|hurts|hurting|fever|temperature|dizzy|dizziness|headache|cough|vomit|nausea|rash|bleed|tired|fatigue|sleep|breath|swelling|numb|symptom)\w*\b/i

export function classifyGuideRisk(text: string): GuideRisk {
  const normalised = normaliseText(text.normalize('NFKC'))

  // Mental-health crisis first: its response (crisis lines, warm copy) is
  // different from the medical-emergency response (emergency services).
  if (assessRisk(text).level === 'acute') {
    return { level: 'high', matched: 'crisis-language', crisis: true }
  }

  for (const [name, pattern] of HIGH_RISK_PATTERNS) {
    if (pattern.test(normalised)) return { level: 'high', matched: name, crisis: false }
  }

  if (SYMPTOM_CONTEXT.test(normalised)) {
    for (const [name, pattern] of MODERATE_RISK_PATTERNS) {
      if (pattern.test(normalised)) return { level: 'moderate', matched: name, crisis: false }
    }
    return { level: 'low', matched: null, crisis: false }
  }

  // No symptom language at all: educational ground, unless it is so short
  // there is nothing to classify.
  const words = normalised.split(/\s+/).filter(Boolean)
  if (words.length < 3) return { level: 'unknown', matched: 'too-short', crisis: false }

  return { level: 'low', matched: null, crisis: false }
}
