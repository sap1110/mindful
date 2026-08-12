/**
 * The fallback search, which needs no model at all.
 *
 * Mindful's rule for the AI layer is that the path for people who cannot or
 * will not download a model has to be a real feature rather than an apology.
 * So Echo works immediately, on every browser, using plain word overlap — and
 * the 23MB download is an *upgrade* to that rather than the price of entry.
 *
 * This is honestly worse than the embedding search, and the difference is
 * specific rather than vague: overlap can only match words that were actually
 * used, so "I cannot switch my brain off" will not reach an entry about lying
 * awake unless both happen to say "awake". The UI names that limitation instead
 * of letting someone conclude their history is emptier than it is.
 *
 * Scores are deliberately produced on the same 0-1 scale as cosine similarity
 * so `RetrievalResult` means the same thing whichever engine filled it — but
 * the thresholds differ, because the distributions do. See `KEYWORD_FLOOR`.
 */

import type { MoodEntry } from '../storage'
import type { Passage } from './corpus'
import { LIBRARY, libraryEmbeddingText, type LibraryCard } from './library'
import {
  MAX_LIBRARY_RESULTS,
  MAX_PERSONAL_RESULTS,
  readTrajectory,
  type LibraryMatch,
  type PersonalMatch,
  type RetrievalResult,
} from './retrieve'

/**
 * Words carrying no retrieval signal. Kept short on purpose: an aggressive
 * stopword list strips the emotional vocabulary this feature exists to match.
 * "alone", "tired" and "cannot" all stay.
 */
const STOPWORDS = new Set([
  'a', 'about', 'again', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'been', 'being', 'but', 'by', 'can', 'did', 'do', 'does', 'doing',
  'for', 'from', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'him',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'me',
  'more', 'my', 'no', 'not', 'of', 'on', 'or', 'our', 'out', 'over', 'own',
  'she', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'to', 'too', 'up', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why',
  'will', 'with', 'would', 'you', 'your',
])

/** Crude but predictable suffix folding, so "feeling" reaches "feel". */
function stem(word: string): string {
  for (const suffix of ['ing', 'ness', 'ed', 'ly', 's']) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length)
    }
  }
  return word
}

export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map(stem)

  return new Set(words)
}

/**
 * Overlap as a fraction of the query, not of the union.
 *
 * Jaccard would punish long journal entries for being long, which is precisely
 * backwards: a paragraph that contains every word of the query is a better
 * match than a six-word note that contains two of them.
 */
export function overlap(query: Set<string>, document: Set<string>): number {
  if (query.size === 0) return 0
  let shared = 0
  for (const token of query) if (document.has(token)) shared += 1
  return shared / query.size
}

/**
 * Higher than the cosine floor: word overlap produces a spikier distribution,
 * and a single shared word out of four is not a memory worth surfacing.
 */
export const KEYWORD_FLOOR = 0.34

export function keywordRetrieve(
  queryText: string,
  passages: readonly Passage[],
  moods: readonly MoodEntry[],
  cards: readonly LibraryCard[] = LIBRARY,
): RetrievalResult {
  const query = tokenize(queryText)

  const scoredPassages: PersonalMatch[] = passages
    .map((passage) => ({
      kind: 'personal' as const,
      passage,
      score: overlap(query, tokenize(passage.text)),
      trajectory: readTrajectory(passage, moods),
    }))
    .filter((match) => match.score >= KEYWORD_FLOOR)
    .sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const personal = scoredPassages
    .filter((match) => {
      if (seen.has(match.passage.entryId)) return false
      seen.add(match.passage.entryId)
      return true
    })
    .slice(0, MAX_PERSONAL_RESULTS)

  const library: LibraryMatch[] = cards
    .map((card) => ({
      kind: 'library' as const,
      card,
      // Cues are included in the embedding text and matter even more here,
      // since they are the only place a card uses everyday phrasing.
      score: overlap(query, tokenize(libraryEmbeddingText(card))),
    }))
    .filter((match) => match.score >= KEYWORD_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LIBRARY_RESULTS)

  return {
    personal,
    library,
    searchedButFoundNothing: passages.length > 0 && personal.length === 0,
  }
}
