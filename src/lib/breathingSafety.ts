import { LIBRARY_SOURCES, type LibrarySourceId } from './echo/library'
import type { BreathingPattern } from './breathing'

/**
 * The safety model for guided breathing.
 *
 * Paced breathing is about as low-risk as a self-care exercise gets, but "low
 * risk" is not "no risk", and this feature adds two things that need saying out
 * loud: breath-holding, which a few people should approach carefully, and an
 * eyes-closed mode, which is only safe if you are somewhere safe to close your
 * eyes. Neither is a footnote, so neither is hidden behind a disclosure
 * triangle — the cautions that apply to the rhythm you picked are on screen
 * before you press Begin, and the ones that matter most are also spoken, since
 * the whole point of the mode is that you are not reading.
 *
 * The same rule the rest of the app follows applies here: Mindful never makes a
 * health claim in its own name. Where a body like the NHS describes a practice,
 * it is named and linked. Where a rhythm is simply widely taught, that is what
 * it says — attributing a folk technique to a health service to make it look
 * authoritative would be worse than saying nothing.
 */

export interface PatternGuidance {
  /** Where the rhythm comes from, stated at the level we can actually stand behind. */
  provenance: string
  /** The citable body, when there is one. `null` means "commonly taught". */
  sourceId: LibrarySourceId | null
  /** Holding the breath is a distinct thing to be careful about. */
  holdsBreath: boolean
  /** Cautions specific to this rhythm, on top of the universal ones. */
  cautions: readonly string[]
  /** Spoken once in the lead-in, when it applies. Kept to one short sentence. */
  spokenCaution?: string
}

const PATTERN_GUIDANCE: Readonly<Record<string, PatternGuidance>> = {
  relaxed: {
    provenance:
      'The NHS describes this rhythm in its breathing exercise for stress: sit or lie comfortably, let the breath reach your belly, and breathe gently in and out to a slow count of five.',
    sourceId: 'nhs',
    holdsBreath: false,
    cautions: [],
  },
  box: {
    provenance:
      'Equal-count breathing with holds, widely taught for steadying attention. It is not described by a named health body in the form used here.',
    sourceId: null,
    holdsBreath: true,
    cautions: [
      'It holds the breath twice a round. Keep the hold comfortable — a hold you have to brace for is too long.',
    ],
    spokenCaution: "Don't force the holds. If one feels long, breathe out early.",
  },
  calming: {
    provenance:
      'The 4-7-8 rhythm, popularised by Dr Andrew Weil, and the longest hold offered here. Commonly taught before sleep; not described by a named health body.',
    sourceId: null,
    holdsBreath: true,
    cautions: [
      'The seven-count hold is the longest here. If it leaves you short of breath, the 5-5 rhythm asks nothing of you and works just as well.',
    ],
    spokenCaution:
      "Don't force the hold. If seven counts is too long, breathe out whenever you need to.",
  },
}

const FALLBACK: PatternGuidance = {
  provenance: 'A paced breathing rhythm.',
  sourceId: null,
  holdsBreath: false,
  cautions: [],
}

export function guidanceFor(patternId: string): PatternGuidance {
  return PATTERN_GUIDANCE[patternId] ?? FALLBACK
}

/**
 * What applies to every rhythm here, whoever is breathing.
 *
 * Deliberately short. A list nobody finishes reading protects nobody, so this
 * is the shortest version that still covers the two things that actually
 * happen: over-breathing, and doing this somewhere you shouldn't.
 */
export const UNIVERSAL_CAUTIONS: readonly string[] = [
  'Breathe gently. This should never feel like effort, and there is no prize for a deeper breath.',
  'If you feel dizzy, lightheaded or tingly, stop and let your breathing return to normal on its own. That feeling passes on its own too.',
  'Do this sitting or lying down, somewhere you are not about to move — never while driving, cycling, in water, or looking after someone who needs watching.',
]

/**
 * The line about who should check first.
 *
 * NCCIH's position on relaxation techniques generally: safe for healthy
 * people, with occasional reports of increased anxiety, and worth raising with
 * a clinician if you have a health condition. Breath-holding is the part of
 * that worth naming specifically.
 */
export const WHO_SHOULD_ASK_FIRST =
  'If you are pregnant, or live with a heart or lung condition, epilepsy, or panic attacks, check with your doctor before practising breathing exercises that hold the breath — and use the 5-5 rhythm, which holds nothing, in the meantime.'

export const WHO_SHOULD_ASK_FIRST_SOURCE: LibrarySourceId = 'nccih'

/**
 * Paced breathing is a poor tool for some people in some moments, and saying so
 * is part of being safe rather than a failure of the feature.
 */
export const NOT_FOR_EVERY_MOMENT =
  'For some people, focusing on the breath makes anxiety worse rather than better, especially mid-panic. If that is what is happening, stop — it is not something you are doing wrong, and it is not the only thing here.'

/** The checks someone confirms once, before the first eyes-closed session. */
export const EYES_CLOSED_CHECKS: readonly string[] = [
  'You are sitting or lying somewhere safe, and nothing needs your eyes for the next few minutes.',
  'You are not driving, cycling, in or near water, or the only adult watching a child.',
  'You can stop at any time by tapping the screen, or pressing Escape — you do not need to look to do it.',
]

/**
 * Spoken in every lead-in, every session, however many times you have heard it.
 * Kept to one short sentence because it is competing with someone's patience,
 * and a safety line nobody waits through is not a safety line.
 */
export const SPOKEN_SAFETY_LINE =
  'If you feel dizzy or lightheaded, stop and let your breathing settle back to normal.'

/** The full spoken safety preamble for a pattern — the universal line, plus its own. */
export function spokenSafetyFor(pattern: BreathingPattern): string {
  const specific = guidanceFor(pattern.id).spokenCaution
  return specific ? `${SPOKEN_SAFETY_LINE} ${specific}` : SPOKEN_SAFETY_LINE
}

/** The source record behind a piece of guidance, for the citation line. */
export function sourceFor(sourceId: LibrarySourceId | null) {
  return sourceId ? LIBRARY_SOURCES[sourceId] : null
}
