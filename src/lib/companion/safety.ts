/**
 * The safety layer, which runs before anything else and does not depend on a
 * model being loaded.
 *
 * Mindful's reflection feature answers by retrieving the person's own past
 * entries rather than by generating text, so there is no hallucination surface
 * to police on the way out. What remains is the way in, and it matters more:
 * someone can type "I don't want to be here anymore" into a box that was built
 * to search their journal. Handing that person a list of old diary entries
 * would be a grotesque answer to what they just said.
 *
 * So every input is assessed first. An acute signal stops retrieval entirely
 * and shows crisis resources instead — copy written by hand here, rendered by
 * the app, never assembled from anything a model produced and never dependent
 * on the embedding model having downloaded successfully.
 *
 * The bias is deliberately toward false positives. Showing a helpline to
 * someone quoting a song lyric costs a moment's mild annoyance. Missing a real
 * disclosure costs something that cannot be undone. Those are not comparable,
 * so the thresholds here are not balanced.
 *
 * Nothing here is logged, scored or kept.
 */

/** How the app must respond, whatever the retrieval would have returned. */
export type RiskLevel = 'none' | 'concern' | 'acute'

export interface RiskAssessment {
  level: RiskLevel
  /**
   * Which pattern fired, for the test suite. Never shown to the person and
   * never stored — being told "you triggered rule 7" is not care.
   */
  matched: string | null
}

/**
 * Language that means someone may be in danger now.
 *
 * Loose patterns rather than exact phrases, because distress is not
 * well-punctuated: "i dont want to be here anymore" has to match as surely as
 * a tidy sentence does. Apostrophes are optional throughout for that reason.
 */
const ACUTE_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['suicide-direct', /\b(kill|killing)\s+(myself|my\s?self)\b/i],
  ['suicide-noun', /\b(suicide|suicidal)\b/i],
  ['end-my-life', /\b(end|ending|take|taking)\s+my\s+(own\s+)?life\b/i],
  ['better-off-dead', /\b(better\s+off\s+dead|rather\s+be\s+dead|want\s+to\s+be\s+dead)\b/i],
  [
    'dont-want-to-live',
    /\b(do\s?n[o’']?t|dont|don’t)\s+want\s+to\s+(live|be\s+here|exist|wake\s+up)\b/i,
  ],
  ['self-harm', /\b(hurt|harm|harming|cut|cutting|injure)\s+(myself|my\s?self)\b/i],
  ['no-point', /\bno\s+(point|reason)\s+(in\s+)?(living|going\s+on|carrying\s+on)\b/i],
  ['plan', /\b(plan|method)\s+to\s+(die|kill\s+myself|end\s+it)\b/i],
  ['end-it-all', /\bend(ing)?\s+it\s+all\b/i],
  ['overdose', /\b(overdose|od)\s+(on|myself)\b/i],
  ['goodbye', /\b(this\s+is\s+goodbye|saying\s+goodbye\s+to\s+everyone)\b/i],
]

/**
 * Heavy, but not an emergency. This does not stop the reflection — it makes
 * the crisis panel quietly available alongside it. Interrupting every low mood
 * with a helpline would train people to stop typing honestly.
 */
const CONCERN_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['hopeless', /\b(hopeless|no\s+hope|nothing\s+will\s+(ever\s+)?(change|get\s+better))\b/i],
  ['worthless', /\b(worthless|hate\s+myself|burden\s+to\s+(everyone|them))\b/i],
  [
    'cant-go-on',
    /\b(can\s?n[o’']?t|cant|can’t|cannot)\s+(go\s+on|do\s+this\s+anymore|take\s+(it|this)\s+anymore)\b/i,
  ],
  ['trapped', /\b(trapped|no\s+way\s+out)\b/i],
  ['alone', /\b(completely|totally|so)\s+alone\b/i],
  ['numb', /\b(numb|empty\s+inside|feel\s+nothing)\b/i],
]

/**
 * Assess what someone has just typed. Acute wins over concern, and the first
 * acute match short-circuits. Order within each list carries no meaning.
 */
export function assessRisk(text: string): RiskAssessment {
  const normalised = text.normalize('NFKC')

  for (const [name, pattern] of ACUTE_PATTERNS) {
    if (pattern.test(normalised)) return { level: 'acute', matched: name }
  }

  for (const [name, pattern] of CONCERN_PATTERNS) {
    if (pattern.test(normalised)) return { level: 'concern', matched: name }
  }

  return { level: 'none', matched: null }
}

/**
 * What Mindful says when someone discloses that they may be in danger.
 *
 * Constant and hand-written. It leads by acknowledging what was said rather
 * than deflecting straight to a phone number, because being handed a helpline
 * the instant you say something hard can read as being shown the door.
 *
 * It is also honest about what this app is. Overstating what a browser tab can
 * do for someone in crisis is its own kind of harm.
 */
export const ACUTE_HEADING = 'That sounds like more than a look back can help with.'

export const ACUTE_BODY = [
  'Thank you for putting it into words here — that is not a small thing to type.',
  'I could show you what you have written before, but that is not what this moment needs, and pretending otherwise would be dishonest.',
  'Please talk to one of the services below. They are free, they are staffed by people, and you do not have to be sure it is serious enough to call.',
]
