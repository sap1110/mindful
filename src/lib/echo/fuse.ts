/**
 * Fusion and re-ranking: turning two disagreeing rankings into one answer.
 *
 * The dense retriever scores by cosine similarity in [-1, 1]; BM25 scores by
 * an unbounded sum of term weights. Those numbers mean different things, and
 * the usual fix — normalise both to 0-1 and add them — quietly invents a
 * comparison that does not exist, because the normalisation depends entirely
 * on which documents happen to be in the result set.
 *
 * Reciprocal rank fusion sidesteps that by throwing the scores away and using
 * only the *order* each retriever put things in. A document ranked first by
 * one engine and twentieth by the other still places well; a document ranked
 * highly by both wins. It needs no tuning, no calibration, and no assumption
 * that two different scales are secretly the same scale.
 *
 * Re-ranking then does the job ranking alone cannot. A person who wrote about
 * the same sleepless week in four consecutive entries would otherwise get four
 * results that are really one memory, so the second pass balances relevance
 * against how much each new result adds to the ones already chosen.
 */

export interface Ranked {
  id: string
  score: number
}

/**
 * The RRF constant. 60 is the value from the original paper and the one most
 * implementations use; it damps the difference between the top few positions
 * so that "first" and "third" are not treated as wildly different judgements.
 */
const RRF_K = 60

export interface FusionInput {
  ranking: readonly Ranked[]
  /**
   * Relative say in the outcome. The dense arm is weighted higher because it
   * is the one that can match meaning across different words — which is the
   * whole reason the model is worth downloading.
   */
  weight: number
  /** Named so the result can explain which engines found a thing. */
  label: string
}

export interface FusedEntry {
  id: string
  score: number
  /** Position in each ranking that contained it, 1-based. */
  positions: Record<string, number>
}

/** Combine any number of rankings by position rather than by score. */
export function reciprocalRankFusion(inputs: readonly FusionInput[]): FusedEntry[] {
  const fused = new Map<string, FusedEntry>()

  for (const input of inputs) {
    input.ranking.forEach((entry, index) => {
      const position = index + 1
      const existing = fused.get(entry.id) ?? { id: entry.id, score: 0, positions: {} }
      existing.score += input.weight * (1 / (RRF_K + position))
      existing.positions[input.label] = position
      fused.set(entry.id, existing)
    })
  }

  return [...fused.values()].sort((a, b) => b.score - a.score)
}

export interface RerankCandidate<T> {
  id: string
  item: T
  /** Fused relevance, already on one scale. */
  relevance: number
}

export interface RerankOptions<T> {
  /** How alike two candidates are, 0-1. Used to penalise near-duplicates. */
  similarity: (a: T, b: T) => number
  /**
   * The relevance/diversity balance. 1 is pure relevance. 0.72 keeps the best
   * match first in practice while stopping three chunks of one week from
   * filling the list.
   */
  lambda?: number
  limit: number
}

/**
 * Maximal marginal relevance.
 *
 * Greedy: take the most relevant, then repeatedly take whichever candidate
 * maximises `λ·relevance − (1−λ)·max similarity to anything already taken`.
 * The first pick is therefore always the top-ranked one — diversity never
 * costs someone their best match, it only decides what accompanies it.
 */
export function maximalMarginalRelevance<T>(
  candidates: readonly RerankCandidate<T>[],
  { similarity, lambda = 0.72, limit }: RerankOptions<T>,
): RerankCandidate<T>[] {
  const pool = [...candidates].sort((a, b) => b.relevance - a.relevance)
  const chosen: RerankCandidate<T>[] = []

  while (pool.length > 0 && chosen.length < limit) {
    let bestIndex = 0
    let bestValue = -Infinity

    pool.forEach((candidate, index) => {
      const redundancy =
        chosen.length === 0
          ? 0
          : Math.max(...chosen.map((taken) => similarity(candidate.item, taken.item)))
      const value = lambda * candidate.relevance - (1 - lambda) * redundancy
      if (value > bestValue) {
        bestValue = value
        bestIndex = index
      }
    })

    chosen.push(pool[bestIndex])
    pool.splice(bestIndex, 1)
  }

  return chosen
}

/**
 * Jaccard overlap between two token sets — the redundancy measure used above.
 *
 * Deliberately lexical rather than semantic. Two entries about the same week
 * repeat the same concrete words, and comparing their vectors would call
 * "Tuesday was hard" and "Wednesday was hard" different because the days
 * differ, which is exactly backwards for deciding whether to show both.
 */
export function tokenSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const token of a) if (b.has(token)) shared += 1
  return shared / (a.size + b.size - shared)
}
