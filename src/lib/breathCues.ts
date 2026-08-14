import type { BreathPhase, BreathingPattern } from './breathing'
import { spokenSafetyFor } from './breathingSafety'

/**
 * What the voice actually says.
 *
 * Kept apart from both the clock and the speech engine so the script can be
 * read, argued with and tested as plain text — the wording of something spoken
 * into someone's ear while their eyes are shut deserves to be reviewable in one
 * place rather than scattered through JSX.
 *
 * Two rules shape all of it. The voice never says anything the screen does not
 * also say, because the spoken guide is an alternative to reading the screen
 * and not a second, richer app hiding behind it. And it stays quiet by default:
 * a cue lands at the top of each phase and nowhere else, so the silence in
 * between belongs to the person breathing.
 */

export interface PhaseCueContext {
  phase: BreathPhase
  phaseIndex: number
  /** 1-based. */
  round: number
  totalRounds: number
}

/**
 * The line for the top of a phase.
 *
 * Always the on-screen phase label, occasionally with a word of place in front
 * of it. The markers only ever appear on the first phase of a round, so they
 * never interrupt a breath already underway.
 */
export function phaseCue({ phase, phaseIndex, round, totalRounds }: PhaseCueContext): string {
  const label = phase.label
  if (phaseIndex !== 0) return label

  // "Last round" is worth hearing; "round two of eleven" is arithmetic.
  if (totalRounds > 1 && round === totalRounds) return `Last round. ${label}`

  // Only in sessions long enough for a halfway point to mean anything, and
  // never where it would collide with the last-round marker.
  const halfway = Math.floor(totalRounds / 2) + 1
  if (totalRounds >= 6 && round === halfway) return `Halfway. ${label}`

  return label
}

export interface IntroOptions {
  pattern: BreathingPattern
  minutes: number
  /** The eyes-closed lead-in is longer: it has to hand over the screen. */
  eyesClosed: boolean
}

/**
 * The lead-in, spoken before the clock starts.
 *
 * In eyes-closed mode this is the last moment anyone is still looking, so it
 * carries everything that would otherwise only exist on a screen nobody is
 * watching: how to settle, that the screen is no longer needed, when to stop,
 * and how to stop without opening your eyes. The safety line is not optional
 * and not skippable — it is the reason this is spoken rather than shown.
 *
 * Length is the constraint. Every extra clause is real seconds of someone
 * sitting waiting to breathe, so the rhythm read-out is dropped from the
 * eyes-closed version: they are about to hear every step of it anyway.
 */
export function introScript({ pattern, minutes, eyesClosed }: IntroOptions): string {
  const length = `${minutes} minute${minutes === 1 ? '' : 's'}`
  const safety = spokenSafetyFor(pattern)

  if (!eyesClosed) {
    return (
      `${length} of ${pattern.name.toLowerCase()} breathing. ${describeRhythm(pattern)} ` +
      `${safety} Let's begin.`
    )
  }

  return (
    `Get comfortable, and let your shoulders drop. ` +
    `When you're ready, close your eyes — you won't need the screen from here. ` +
    `${safety} Touch the screen anywhere to pause. ` +
    `${length}, starting now.`
  )
}

/** The pattern read out as a sentence: "In for four, hold for four, out for four." */
export function describeRhythm(pattern: BreathingPattern): string {
  const steps = pattern.phases.map((phase) => `${spokenVerb(phase)} for ${phase.seconds}`)
  const sentence = steps.join(', ')
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
}

function spokenVerb(phase: BreathPhase): string {
  switch (phase.kind) {
    case 'inhale':
      return 'in'
    case 'exhale':
      return 'out'
    case 'hold':
      return 'hold'
  }
}

/** Spoken when the last round finishes on its own. */
export function closingCue(rounds: number, eyesClosed: boolean): string {
  const counted = `That's the session — ${rounds} ${rounds === 1 ? 'round' : 'rounds'}.`
  const ending = eyesClosed
    ? `Stay here as long as you like, and open your eyes when you're ready.`
    : `Take a moment before you get up.`
  return `${counted} Notice how you feel. ${ending}`
}

/** Spoken when someone stops part-way. Never disappointed, never a streak. */
export function stoppedCue(): string {
  return `Stopped. That still counts as breathing.`
}

export const PAUSED_CUE = 'Paused.'
export const RESUMED_CUE = "Carrying on. Let's find the rhythm again."

/** The line the "hear this voice" button reads, so the choice can be made first. */
export function previewCue(): string {
  return 'Breathe in, slowly. And breathe out. This is the voice that will guide you.'
}
