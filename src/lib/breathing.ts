/**
 * Breathing patterns.
 *
 * A pattern is just an ordered list of phases with a duration and a target
 * scale for the halo, so adding one is data rather than code. `scale` is the
 * size the halo should be *heading towards* during that phase — the animation
 * eases into it over exactly the phase's own duration, which is what makes the
 * circle and the count agree.
 */

export type BreathPhaseKind = 'inhale' | 'hold' | 'exhale' | 'rest'

export interface BreathPhase {
  kind: BreathPhaseKind
  /** Spoken, on-screen instruction. Never an icon alone. */
  label: string
  seconds: number
  scale: number
}

export interface BreathingPattern {
  id: string
  name: string
  /** The rhythm written out, e.g. "4-4-4-4". */
  rhythm: string
  description: string
  phases: readonly BreathPhase[]
}

const INHALE_SCALE = 1
const EXHALE_SCALE = 0.74

export const BREATHING_PATTERNS: readonly BreathingPattern[] = [
  {
    id: 'box',
    name: 'Box',
    rhythm: '4-4-4-4',
    description: 'Equal in, hold, out, hold. Steadying when your thoughts are racing.',
    phases: [
      { kind: 'inhale', label: 'Breathe in', seconds: 4, scale: INHALE_SCALE },
      { kind: 'hold', label: 'Hold', seconds: 4, scale: INHALE_SCALE },
      { kind: 'exhale', label: 'Breathe out', seconds: 4, scale: EXHALE_SCALE },
      { kind: 'rest', label: 'Rest', seconds: 4, scale: EXHALE_SCALE },
    ],
  },
  {
    id: 'calming',
    name: 'Calming',
    rhythm: '4-7-8',
    description: 'A long out-breath. The one most people have heard of, good before sleep.',
    phases: [
      { kind: 'inhale', label: 'Breathe in', seconds: 4, scale: INHALE_SCALE },
      { kind: 'hold', label: 'Hold', seconds: 7, scale: INHALE_SCALE },
      { kind: 'exhale', label: 'Breathe out', seconds: 8, scale: EXHALE_SCALE },
    ],
  },
  {
    id: 'relaxed',
    name: 'Relaxed',
    rhythm: '5-5',
    description: 'Slow and even, nothing held. The gentlest of the three.',
    phases: [
      { kind: 'inhale', label: 'Breathe in', seconds: 5, scale: INHALE_SCALE },
      { kind: 'exhale', label: 'Breathe out', seconds: 5, scale: EXHALE_SCALE },
    ],
  },
] as const

export const DEFAULT_PATTERN_ID = 'box'

export function breathingPattern(id: string): BreathingPattern {
  return BREATHING_PATTERNS.find((pattern) => pattern.id === id) ?? BREATHING_PATTERNS[0]
}

export function cycleSeconds(pattern: BreathingPattern): number {
  return pattern.phases.reduce((total, phase) => total + phase.seconds, 0)
}

/** Session lengths offered on screen. Nothing here is a goal or a target. */
export const SESSION_LENGTHS = [
  { id: 'short', minutes: 1, label: '1 min' },
  { id: 'medium', minutes: 3, label: '3 min' },
  { id: 'long', minutes: 5, label: '5 min' },
] as const

export type SessionLengthId = (typeof SESSION_LENGTHS)[number]['id']

export function sessionLength(id: SessionLengthId) {
  return SESSION_LENGTHS.find((option) => option.id === id) ?? SESSION_LENGTHS[1]
}

/** How many rounds of this pattern fit in the chosen length. Always at least one. */
export function roundsFor(pattern: BreathingPattern, minutes: number): number {
  return Math.max(1, Math.round((minutes * 60) / cycleSeconds(pattern)))
}
