/**
 * On-device profile storage.
 *
 * Phase 1 has no backend and no account: the "auth gate" is simply whether a
 * completed profile exists in this browser's localStorage. Nothing here ever
 * leaves the device, which is a product promise, not just an implementation
 * detail — see the privacy copy on the landing screen.
 */

export const PROFILE_STORAGE_KEY = 'mindful.profile.v1'

/** Bump when the shape changes so stale profiles are discarded, not crashed on. */
export const PROFILE_SCHEMA_VERSION = 1

export type ReasonId =
  | 'stress'
  | 'anxiety'
  | 'low-mood'
  | 'sleep'
  | 'focus'
  | 'loneliness'
  | 'grief'
  | 'self-understanding'

export type CopingStyleId = 'breathing' | 'journaling' | 'movement' | 'grounding' | 'connection'

export interface Profile {
  version: number
  /** What the person would like to be called. Free text, never validated as a legal name. */
  name: string
  reasons: ReasonId[]
  copingStyle: CopingStyleId
  /** ISO timestamp of when onboarding was completed. */
  completedAt: string
}

/* --------------------------------------------------------------- content */

export interface ReasonOption {
  id: ReasonId
  label: string
  description: string
}

/**
 * Deliberately non-clinical wording. These are reasons for showing up, not
 * symptoms, and nothing here is a diagnosis or a screening instrument.
 */
export const REASON_OPTIONS: readonly ReasonOption[] = [
  { id: 'stress', label: 'Everyday stress', description: 'Too much on, not enough slack' },
  { id: 'anxiety', label: 'Anxious thoughts', description: 'A mind that races ahead' },
  { id: 'low-mood', label: 'Low mood', description: 'Flat, heavy, or hard to start' },
  { id: 'sleep', label: 'Rest and sleep', description: 'Winding down takes a while' },
  { id: 'focus', label: 'Focus', description: 'Attention scatters easily' },
  { id: 'loneliness', label: 'Feeling alone', description: 'Wanting more connection' },
  { id: 'grief', label: 'Loss or change', description: 'Carrying something heavy' },
  { id: 'self-understanding', label: 'Knowing myself', description: 'Curious, not in crisis' },
] as const

export interface CopingStyleOption {
  id: CopingStyleId
  label: string
  description: string
  /** Shown on the completion screen as the first thing Mindful will offer. */
  firstStep: string
}

export const COPING_STYLE_OPTIONS: readonly CopingStyleOption[] = [
  {
    id: 'breathing',
    label: 'Breathing',
    description: 'Slow, guided breath to settle the body first.',
    firstStep: 'a two-minute guided breath',
  },
  {
    id: 'journaling',
    label: 'Writing it out',
    description: 'Gentle prompts to get what is in your head onto a page.',
    firstStep: 'a one-line journal prompt',
  },
  {
    id: 'movement',
    label: 'Moving',
    description: 'Small physical resets — a stretch, a walk, a shake-out.',
    firstStep: 'a sixty-second stretch',
  },
  {
    id: 'grounding',
    label: 'Grounding',
    description: 'Senses-first exercises that bring you back to the room.',
    firstStep: 'a 5-4-3-2-1 grounding round',
  },
  {
    id: 'connection',
    label: 'Reaching out',
    description: 'Nudges to talk to someone you trust, when you want them.',
    firstStep: 'a prompt to message one person',
  },
] as const

export const NAME_MAX_LENGTH = 40

/* --------------------------------------------------------------- storage */

const isReasonId = (value: unknown): value is ReasonId =>
  REASON_OPTIONS.some((option) => option.id === value)

const isCopingStyleId = (value: unknown): value is CopingStyleId =>
  COPING_STYLE_OPTIONS.some((option) => option.id === value)

/**
 * Parse untrusted localStorage content. Anything that does not match the
 * current schema is treated as absent rather than partially trusted.
 */
export function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Partial<Record<keyof Profile, unknown>>

  if (candidate.version !== PROFILE_SCHEMA_VERSION) return null
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) return null
  if (!Array.isArray(candidate.reasons) || !candidate.reasons.every(isReasonId)) return null
  if (!isCopingStyleId(candidate.copingStyle)) return null
  if (typeof candidate.completedAt !== 'string') return null

  return {
    version: PROFILE_SCHEMA_VERSION,
    name: candidate.name.slice(0, NAME_MAX_LENGTH),
    reasons: Array.from(new Set(candidate.reasons)),
    copingStyle: candidate.copingStyle,
    completedAt: candidate.completedAt,
  }
}

/** Read the stored profile. Returns null in private/blocked-storage contexts too. */
export function loadProfile(): Profile | null {
  try {
    return parseProfile(window.localStorage.getItem(PROFILE_STORAGE_KEY))
  } catch {
    return null
  }
}

/** Persist a profile. Silently no-ops if storage is unavailable (Safari private mode). */
export function saveProfile(profile: Profile): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    /* Storage is a nice-to-have; the session still works without it. */
  }
}

export function clearProfile(): void {
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY)
  } catch {
    /* no-op */
  }
}

/* ---------------------------------------------------------------- helpers */

export function createProfile(input: {
  name: string
  reasons: ReasonId[]
  copingStyle: CopingStyleId
  completedAt: string
}): Profile {
  return {
    version: PROFILE_SCHEMA_VERSION,
    name: input.name.trim().slice(0, NAME_MAX_LENGTH),
    reasons: Array.from(new Set(input.reasons)),
    copingStyle: input.copingStyle,
    completedAt: input.completedAt,
  }
}

export function reasonLabel(id: ReasonId): string {
  return REASON_OPTIONS.find((option) => option.id === id)?.label ?? id
}

export function copingStyle(id: CopingStyleId): CopingStyleOption | undefined {
  return COPING_STYLE_OPTIONS.find((option) => option.id === id)
}

/** "morning" / "afternoon" / "evening" — used for the greeting on /home. */
export function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 5) return 'late night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}
