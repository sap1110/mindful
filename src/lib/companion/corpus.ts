/**
 * Turning the on-device dataset into something searchable.
 *
 * Only text the person actually wrote becomes a passage: journal bodies and
 * mood notes. Tags and scores are carried alongside as metadata but are never
 * embedded — "tired, work" is not a sentence, and letting a bag of tags compete
 * with real writing for a match produces confident nonsense.
 *
 * Screener results are deliberately not passages either. A PHQ-9 score is not
 * something someone said about their week, and surfacing "you scored 14" in
 * answer to "I feel awful today" would be the app telling a person what their
 * feeling means. That is the line the whole codebase is written not to cross.
 */

import { formatLongDay } from '../date'
import type { MindfulData, MoodEntry } from '../storage'
import { moodLabel, moodTagLabel } from '../mood'

/** Below this, a note is too short to embed meaningfully. */
const MIN_PASSAGE_CHARS = 24

/**
 * Long entries are split so a match points at the part that actually matched.
 * Sized generously: MiniLM handles 256 tokens, and splitting mid-thought to
 * chase precision makes the quoted excerpt read like a ransom note.
 */
const MAX_PASSAGE_CHARS = 480

export type PassageSource = 'journal' | 'mood-note'

export interface Passage {
  /** `${entryId}#${chunkIndex}` — stable, so vectors can be cached against it. */
  id: string
  entryId: string
  source: PassageSource
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string
  /** The text that gets embedded, and the text that gets quoted back. */
  text: string
  /** The mood score recorded that day, when there was one. */
  score?: number
  tags: string[]
}

/** Split on sentence boundaries where possible, hard-wrap only when forced. */
function chunk(text: string): string[] {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_PASSAGE_CHARS) return [trimmed]

  const sentences = trimmed.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > MAX_PASSAGE_CHARS && current.length > 0) {
      chunks.push(current.trim())
      current = ''
    }
    // A single sentence longer than the limit: take it whole rather than
    // slicing a thought in half.
    current = current.length > 0 ? `${current} ${sentence}` : sentence
  }

  if (current.trim().length > 0) chunks.push(current.trim())
  return chunks
}

/**
 * Build the searchable corpus, newest first.
 *
 * Mood entries are indexed by date so a journal entry can carry the score from
 * the same day — which is what makes "what did the days after look like"
 * answerable at all.
 */
export function buildCorpus(data: MindfulData): Passage[] {
  const moodByDate = new Map<string, MoodEntry>()
  for (const entry of data.moods) moodByDate.set(entry.date, entry)

  const passages: Passage[] = []

  for (const entry of data.journal) {
    const sameDay = moodByDate.get(entry.date)
    chunk(entry.body).forEach((text, index) => {
      if (text.length < MIN_PASSAGE_CHARS) return
      passages.push({
        id: `${entry.id}#${index}`,
        entryId: entry.id,
        source: 'journal',
        date: entry.date,
        text,
        score: sameDay?.score,
        tags: sameDay?.tags ?? [],
      })
    })
  }

  for (const entry of data.moods) {
    const note = entry.note?.trim()
    if (!note || note.length < MIN_PASSAGE_CHARS) continue
    passages.push({
      id: `${entry.id}#0`,
      entryId: entry.id,
      source: 'mood-note',
      date: entry.date,
      text: note,
      score: entry.score,
      tags: entry.tags,
    })
  }

  return passages.sort((a, b) => b.date.localeCompare(a.date))
}

/** A one-line description of the day a passage came from, for the result card. */
export function describePassageDay(passage: Passage): string {
  const parts = [formatLongDay(passage.date)]
  if (passage.score !== undefined) parts.push(moodLabel(passage.score as 1 | 2 | 3 | 4 | 5))
  if (passage.tags.length > 0) parts.push(passage.tags.map(moodTagLabel).join(', '))
  return parts.join(' · ')
}
