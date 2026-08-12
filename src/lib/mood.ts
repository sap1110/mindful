import type { MoodScore } from './storage'

/**
 * The five-point scale.
 *
 * Five buckets, not a 1–10 slider: a check-in should take two seconds and mean
 * the same thing next month. Every level carries a written label as well as a
 * face — the face is decorative, the word is the content, so the scale still
 * works for anyone who cannot see the emoji or the colour.
 */
export interface MoodLevel {
  score: MoodScore
  id: string
  label: string
  /** Decorative — always paired with `label` in the UI, never used alone. */
  face: string
  /** A short gloss, shown under the label on wider screens. */
  hint: string
  /** Fill for the history strip. Height carries the same information. */
  barClass: string
  /** Tint for the selected state of the face tile. */
  tintClass: string
}

export const MOOD_LEVELS: readonly MoodLevel[] = [
  {
    score: 1,
    id: 'rough',
    label: 'Rough',
    face: '😞',
    hint: 'A hard day',
    barClass: 'bg-clay-400',
    tintClass: 'bg-clay-50',
  },
  {
    score: 2,
    id: 'low',
    label: 'Low',
    face: '🙁',
    hint: 'Heavy going',
    barClass: 'bg-clay-200',
    tintClass: 'bg-clay-50',
  },
  {
    score: 3,
    id: 'okay',
    label: 'Okay',
    face: '😐',
    hint: 'Somewhere in between',
    barClass: 'bg-cream-400',
    tintClass: 'bg-cream-200',
  },
  {
    score: 4,
    id: 'good',
    label: 'Good',
    face: '🙂',
    hint: 'Mostly steady',
    barClass: 'bg-sage-300',
    tintClass: 'bg-sage-50',
  },
  {
    score: 5,
    id: 'great',
    label: 'Great',
    face: '😊',
    hint: 'A good one',
    barClass: 'bg-sage-500',
    tintClass: 'bg-sage-100',
  },
] as const

export function moodLevel(score: MoodScore): MoodLevel {
  return MOOD_LEVELS.find((level) => level.score === score) ?? MOOD_LEVELS[2]
}

export function moodLabel(score: MoodScore): string {
  return moodLevel(score).label
}

/** Bar height for the history strip, as a percentage of the track. */
export function moodBarHeight(score: MoodScore): string {
  return `${20 + (score - 1) * 20}%`
}

/* ------------------------------------------------------------------ tags */

export interface MoodTag {
  id: string
  label: string
}

/**
 * A small fixed set. Free-text tags would fragment into forty spellings of
 * "tired" and make the history unreadable, so the vocabulary stays closed and
 * the free-text goes in the note instead.
 */
export const MOOD_TAGS: readonly MoodTag[] = [
  { id: 'calm', label: 'Calm' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'tired', label: 'Tired' },
  { id: 'energised', label: 'Energised' },
  { id: 'focused', label: 'Focused' },
  { id: 'restless', label: 'Restless' },
  { id: 'low', label: 'Low' },
  { id: 'grateful', label: 'Grateful' },
] as const

export function moodTagLabel(id: string): string {
  return MOOD_TAGS.find((tag) => tag.id === id)?.label ?? id
}

export const NOTE_MAX_LENGTH = 280
