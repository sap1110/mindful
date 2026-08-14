import { tokenList } from './keyword'

/**
 * Query expansion for the lexical arm.
 *
 * BM25 can only match words that were actually written. Someone who asks about
 * being "knackered" will not reach the entry where they wrote "exhausted",
 * even though the dense arm has no trouble with it — so the lexical side gets
 * a small, hand-written set of near-synonyms for the vocabulary this app deals
 * in. It is applied to the *query* only, never to the corpus: expanding what
 * someone wrote in their diary would change the record.
 *
 * A synonym list is an opinion about whose words are the standard ones, which
 * is worth being uncomfortable about in a mental-health app. Three rules keep
 * it honest. It is additive — an expansion never replaces the word someone
 * chose, so their own phrasing always scores at least as well as the
 * substitute. It is symmetric — every group expands to every other member, so
 * no variant is treated as the "correct" spelling of a feeling. And expansions
 * are weighted below the original terms in `pipeline.ts`, so a document
 * containing the actual word always outranks one containing only a synonym.
 *
 * The dense arm needs none of this and gets none of it.
 */

/**
 * Groups of words that mean close enough to the same thing in this context.
 * Stemmed on use, so "exhausted" and "exhausting" fold together anyway.
 */
const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  ['tired', 'exhausted', 'knackered', 'shattered', 'drained', 'wiped', 'weary'],
  ['sad', 'down', 'low', 'blue', 'miserable', 'unhappy', 'gutted'],
  ['anxious', 'anxiety', 'nervous', 'worried', 'panicky', 'jittery', 'uneasy'],
  ['angry', 'furious', 'annoyed', 'irritated', 'frustrated', 'livid'],
  ['scared', 'afraid', 'frightened', 'terrified', 'fearful'],
  ['lonely', 'alone', 'isolated', 'lonesome'],
  ['stressed', 'stress', 'pressure', 'overwhelmed', 'swamped', 'overloaded'],
  ['sleep', 'sleeping', 'asleep', 'awake', 'insomnia', 'restless'],
  ['work', 'job', 'office', 'shift', 'deadline', 'boss'],
  ['study', 'exam', 'revision', 'coursework', 'assignment', 'uni', 'college'],
  ['money', 'rent', 'bills', 'broke', 'skint', 'debt'],
  ['friend', 'friends', 'mate', 'mates'],
  ['family', 'mum', 'mom', 'dad', 'parents', 'brother', 'sister'],
  ['partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'relationship'],
  ['crying', 'cried', 'tears', 'weeping', 'sobbing'],
  ['numb', 'empty', 'flat', 'blank', 'hollow'],
  ['thinking', 'thoughts', 'overthinking', 'ruminating', 'dwelling'],
  ['racing', 'spiralling', 'spinning', 'whirring', 'churning'],
  ['guilty', 'guilt', 'ashamed', 'shame', 'embarrassed'],
  ['hopeless', 'pointless', 'futile', 'useless'],
  ['calm', 'settled', 'steady', 'grounded', 'peaceful'],
  ['better', 'improving', 'easier', 'lighter'],
  ['worse', 'harder', 'heavier', 'declining'],
  ['sick', 'ill', 'unwell', 'poorly'],
  ['appointment', 'therapy', 'counselling', 'therapist', 'doctor', 'gp'],
]

/** Built once: stemmed term to every stemmed sibling in its groups. */
const EXPANSIONS: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, Set<string>>()

  for (const group of SYNONYM_GROUPS) {
    const stemmed = group.flatMap((word) => tokenList(word))
    for (const term of stemmed) {
      const existing = map.get(term) ?? new Set<string>()
      for (const sibling of stemmed) if (sibling !== term) existing.add(sibling)
      map.set(term, existing)
    }
  }

  return new Map([...map].map(([term, siblings]) => [term, [...siblings]]))
})()

export interface ExpandedQuery {
  /** Exactly what was typed, stemmed. Always weighted highest. */
  terms: string[]
  /** Added near-synonyms, never replacing the above. */
  expansions: string[]
}

export function expandQuery(text: string): ExpandedQuery {
  const terms = tokenList(text)
  const original = new Set(terms)
  const expansions = new Set<string>()

  for (const term of terms) {
    for (const sibling of EXPANSIONS.get(term) ?? []) {
      if (!original.has(sibling)) expansions.add(sibling)
    }
  }

  return { terms, expansions: [...expansions] }
}
