/**
 * Retrieval: finding the moments that actually resemble this one.
 *
 * Two corpora are searched with the same query vector. The person's own
 * passages (`corpus.ts`) are the point of the feature; the curated library
 * (`library.ts`) exists so that someone with no history yet gets something
 * real instead of an empty screen.
 *
 * Vectors are held in memory only, never written to storage. They are derived
 * from journal text, which makes them personal data in their own right — a
 * cached copy on disk would be one more thing the erase button has to
 * remember to destroy, and the safest place for a copy of someone's diary is
 * nowhere. Rebuilding the index costs a second or two on a screen that opens
 * rarely, which is a good trade.
 *
 * On honesty about weak matches. The relevance floor below is the difference
 * between a feature that finds something and one that always says it found
 * something. Cosine similarity will happily rank the least-unrelated entry
 * first when nothing is related at all, and presenting that as "you have felt
 * this before" would be inventing a pattern out of noise — in an app whose
 * entire pitch is that it does not do that.
 */

import { formatLongDay } from '../date'
import type { MindfulData, MoodEntry } from '../storage'
import type { Passage } from './corpus'
import type { LibraryCard } from './library'

/**
 * Cosine floor for a match to be shown at all.
 *
 * MiniLM puts genuinely related short texts comfortably above this and
 * unrelated ones well below. Tuned to be conservative: a missed match shows a
 * smaller answer, a false match tells someone something untrue about their own
 * life.
 */
export const MIN_RELEVANCE = 0.36

/** A higher bar for the library, which should never crowd out personal history. */
export const MIN_LIBRARY_RELEVANCE = 0.3

export const MAX_PERSONAL_RESULTS = 3
export const MAX_LIBRARY_RESULTS = 2

/** Vectors are unit length (see `embeddings.ts`), so this is just a dot product. */
export function similarity(a: Float32Array, b: Float32Array): number {
  let total = 0
  for (let i = 0; i < a.length; i += 1) total += a[i] * b[i]
  return total
}

/* ---------------------------------------------------------------- trajectory */

/**
 * What the days after a past entry looked like.
 *
 * `harder` is not a failure state to be hidden. Someone whose mood fell after a
 * similar week deserves to be told that plainly — partly because it is true,
 * and partly because that is precisely the case where the useful next step is a
 * conversation with a person rather than a reassuring sentence from an app.
 *
 * `unknown` is the common case early on and is treated as a first-class answer:
 * saying "there is not enough here yet" is better than inferring a direction
 * from two data points.
 */
export type Trajectory = 'lifted' | 'similar' | 'harder' | 'unknown'

/** Days after a passage to look at. Two weeks matches the screeners' window. */
const TRAJECTORY_WINDOW_DAYS = 14

/** Mood points needed after the entry before any direction is claimed. */
const MIN_TRAJECTORY_POINTS = 2

/**
 * A move of less than this on the 1-5 scale is not a direction, it is a
 * different Tuesday.
 */
const MEANINGFUL_MOOD_SHIFT = 0.6

export interface TrajectoryReading {
  direction: Trajectory
  /** Mood on the day of the passage, when it was recorded. */
  baseline: number | null
  /** Mean mood across the window that followed. */
  after: number | null
  /** How many days contributed, so the UI can be honest about the sample. */
  points: number
}

export function readTrajectory(passage: Passage, moods: readonly MoodEntry[]): TrajectoryReading {
  const baseline = passage.score ?? null

  const windowEnd = addDaysISO(passage.date, TRAJECTORY_WINDOW_DAYS)
  const following = moods.filter(
    (entry) => entry.date > passage.date && entry.date <= windowEnd,
  )

  if (baseline === null || following.length < MIN_TRAJECTORY_POINTS) {
    return { direction: 'unknown', baseline, after: null, points: following.length }
  }

  const after = following.reduce((total, entry) => total + entry.score, 0) / following.length
  const delta = after - baseline

  let direction: Trajectory = 'similar'
  if (delta >= MEANINGFUL_MOOD_SHIFT) direction = 'lifted'
  else if (delta <= -MEANINGFUL_MOOD_SHIFT) direction = 'harder'

  return { direction, baseline, after, points: following.length }
}

/** Local date arithmetic on `YYYY-MM-DD`, matching `lib/date.ts`. */
function addDaysISO(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * How the app describes a trajectory. Deliberately flat in tone — the lifted
 * case does not celebrate and the harder case does not console, because both
 * are just what the record says.
 */
export function describeTrajectory(reading: TrajectoryReading): string {
  switch (reading.direction) {
    case 'lifted':
      return `In the two weeks after that, your check-ins moved upward — ${reading.points} of them, averaging higher than that day.`
    case 'harder':
      return `In the two weeks after that, your check-ins went lower rather than higher. That stretch got harder before it got easier, and it is the kind of thing worth mentioning to someone.`
    case 'similar':
      return `In the two weeks after that, your check-ins stayed at much the same level.`
    default:
      return reading.baseline === null
        ? 'There was no check-in recorded that day, so there is nothing to compare it against.'
        : 'There are not enough check-ins after that day to say which way things went.'
  }
}

/* ------------------------------------------------------------------ results */

export interface PersonalMatch {
  kind: 'personal'
  passage: Passage
  score: number
  trajectory: TrajectoryReading
}

export interface LibraryMatch {
  kind: 'library'
  card: LibraryCard
  score: number
}

export interface RetrievalResult {
  personal: PersonalMatch[]
  library: LibraryMatch[]
  /** True when the person has writing on file but none of it was close enough. */
  searchedButFoundNothing: boolean
}

export interface IndexedPassage {
  passage: Passage
  vector: Float32Array
}

export interface IndexedCard {
  card: LibraryCard
  vector: Float32Array
}

/**
 * Rank both corpora against one query vector.
 *
 * Library results are always computed, but the UI leads with personal ones when
 * there are any — being shown your own words is the whole point, and generic
 * advice offered first would read as the app changing the subject.
 */
export function retrieve(
  query: Float32Array,
  passages: readonly IndexedPassage[],
  cards: readonly IndexedCard[],
  moods: readonly MoodEntry[],
): RetrievalResult {
  const personal = passages
    .map((entry) => ({
      kind: 'personal' as const,
      passage: entry.passage,
      score: similarity(query, entry.vector),
      trajectory: readTrajectory(entry.passage, moods),
    }))
    .filter((match) => match.score >= MIN_RELEVANCE)
    .sort((a, b) => b.score - a.score)

  // One match per entry: three chunks of the same long journal entry is one
  // memory, not three, and listing it three times would overstate the echo.
  const seen = new Set<string>()
  const dedupedPersonal = personal
    .filter((match) => {
      if (seen.has(match.passage.entryId)) return false
      seen.add(match.passage.entryId)
      return true
    })
    .slice(0, MAX_PERSONAL_RESULTS)

  const library = cards
    .map((entry) => ({
      kind: 'library' as const,
      card: entry.card,
      score: similarity(query, entry.vector),
    }))
    .filter((match) => match.score >= MIN_LIBRARY_RELEVANCE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LIBRARY_RESULTS)

  return {
    personal: dedupedPersonal,
    library,
    searchedButFoundNothing: passages.length > 0 && dedupedPersonal.length === 0,
  }
}

/** Headline for a set of results. Never claims a pattern it has not found. */
export function summarise(result: RetrievalResult, data: MindfulData): string {
  if (result.personal.length > 0) {
    const oldest = result.personal[result.personal.length - 1]
    return result.personal.length === 1
      ? `You wrote something close to this once before, on ${formatLongDay(oldest.passage.date)}.`
      : `You have written something close to this ${result.personal.length} times before.`
  }

  if (result.searchedButFoundNothing) {
    return 'Nothing you have written so far reads much like this. That may just mean it is new.'
  }

  const written = data.journal.length + data.moods.filter((entry) => entry.note).length
  return written === 0
    ? 'There is nothing on this device to look back through yet — this is where your own entries will appear once you have written a few.'
    : 'There is not much here to look back through yet.'
}
