import type { MindfulData } from '../storage'
import type { Passage } from './corpus'
import { expandQuery } from './expand'
import {
  maximalMarginalRelevance,
  reciprocalRankFusion,
  tokenSimilarity,
  type FusionInput,
} from './fuse'
import {
  bm25Ranking,
  buildLexicalIndex,
  sharedTerms,
  tokenize,
  type LexicalIndex,
} from './keyword'
import { LIBRARY, libraryEmbeddingText, type LibraryCard } from './library'
import {
  MAX_LIBRARY_RESULTS,
  MAX_PERSONAL_RESULTS,
  MIN_LIBRARY_RELEVANCE,
  MIN_RELEVANCE,
  readTrajectory,
  similarity,
  summarise,
  type IndexedCard,
  type IndexedPassage,
  type LibraryMatch,
  type PersonalMatch,
} from './retrieve'
import { assessRisk, type RiskAssessment } from './safety'
import { verifyResult, type VerifiedResult } from './verify'

/**
 * Echo's retrieval pipeline, stage by stage.
 *
 *   1. guard      assess the query for risk, before anything is searched
 *   2. expand     stem the query; add near-synonyms for the lexical arm only
 *   3. retrieve   two independent rankings — BM25 over terms, cosine over
 *                 embeddings — each applying its own relevance floor
 *   4. fuse       reciprocal rank fusion, by position rather than by score
 *   5. aggregate  collapse chunks back to the entry they came from
 *   6. rerank     maximal marginal relevance, so one week cannot fill the list
 *   7. verify     provenance, verbatim text, claim support, attribution
 *   8. explain    why each surviving result is here, in words
 *
 * The staging is the point. Each step has one job, takes a defined input and
 * produces a defined output, and can be run and tested without the ones around
 * it — which is what makes the retrieval quality measurable at all (see
 * `evaluation.ts`) rather than a matter of trying it a few times and liking
 * the look of it.
 *
 * Everything runs in the browser, on this device, over data that never leaves
 * it. The pipeline never fabricates: stage 7 refuses to pass on anything that
 * is not a literal substring of something the person actually wrote.
 *
 * With no dense arm — no model downloaded, or a browser that cannot run one —
 * exactly the same stages run with one retriever instead of two. That path is
 * a supported mode, not a degraded one, and it is the mode most people meet
 * first.
 */

/** How much say each retriever gets in the fusion. */
const DENSE_WEIGHT = 1
const LEXICAL_WEIGHT = 0.8
/** Expanded synonyms rank separately and count for less than what was typed. */
const EXPANSION_WEIGHT = 0.35

/**
 * The single confidence floor applied at verification, on a 0-1 scale where
 * both arms mean "how much of this query is accounted for". Each retriever
 * also applies its own, stricter floor upstream; this one is the backstop.
 */
export const MIN_CONFIDENCE = 0.34

/** Candidates carried past fusion, before diversity re-ranking trims them. */
const CANDIDATE_DEPTH = 12

/**
 * What a near-synonym is worth when deciding whether a match is strong enough.
 *
 * Not zero, or the expansion would find entries the confidence floor then threw
 * away — which is exactly what happened before the evaluation set caught it:
 * an entry that says "lying awake" is a real answer to "I cannot sleep", and
 * counting only the literal words scored it 0.2 and dropped it. Not one either,
 * because "awake" is evidence about "sleep" and not the same claim.
 */
const EXPANSION_CREDIT = 0.6

export type SearchMode = 'hybrid' | 'lexical'

export interface PipelineStage {
  name: string
  /** How many candidates survived this stage. */
  kept: number
  note?: string
}

export interface EchoAnswer {
  query: string
  risk: RiskAssessment
  /** Null when the risk guard stopped the search before it ran. */
  result: VerifiedResult | null
  summary: string
  mode: SearchMode
  /** What each stage did, for the "how this worked" panel and the tests. */
  trace: PipelineStage[]
}

export interface DenseArm {
  queryVector: Float32Array
  passages: readonly IndexedPassage[]
  cards: readonly IndexedCard[]
}

export interface PipelineInput {
  query: string
  passages: readonly Passage[]
  data: MindfulData
  cards?: readonly LibraryCard[]
  /** Omit to run lexical-only — the no-model path. */
  dense?: DenseArm | null
}

/* ------------------------------------------------------------ explanations */

/**
 * Why a result is on screen, in the plainest words available.
 *
 * Shown to the person, not just logged. Being told "this came up because you
 * used the same words" or "because it means something similar, though you
 * wrote it differently" is the difference between a search that seems to know
 * things about you and one you can check.
 */
function explainPersonal(
  shared: readonly string[],
  related: readonly string[],
  cosine: number | null,
  chunks: number,
): string[] {
  const why: string[] = []
  const quote = (terms: readonly string[]) =>
    terms.slice(0, 4).map((term) => `“${term}”`).join(', ')

  if (shared.length > 0) why.push(`You used the same words here — ${quote(shared)}.`)

  if (related.length > 0) {
    why.push(
      shared.length > 0
        ? `It also uses related words — ${quote(related)}.`
        : `You put it differently here, but with related words — ${quote(related)}.`,
    )
  }

  if (cosine !== null && cosine >= MIN_RELEVANCE) {
    why.push(
      shared.length > 0 || related.length > 0
        ? 'It also reads as close in meaning.'
        : 'It reads as close in meaning, even though none of the words are the same.',
    )
  }

  if (chunks > 1) why.push(`The same entry matched in ${chunks} places.`)

  return why
}

/* ----------------------------------------------------------------- the run */

export function runPipeline({
  query,
  passages,
  data,
  cards = LIBRARY,
  dense = null,
}: PipelineInput): EchoAnswer {
  const trimmed = query.trim()
  const trace: PipelineStage[] = []
  const mode: SearchMode = dense ? 'hybrid' : 'lexical'

  /* 1. guard ------------------------------------------------------------- */

  const risk = assessRisk(trimmed)
  trace.push({ name: 'guard', kept: 0, note: `risk: ${risk.level}` })

  if (risk.level === 'acute') {
    return { query: trimmed, risk, result: null, summary: '', mode, trace }
  }

  /* 2. expand ------------------------------------------------------------ */

  const { terms, expansions } = expandQuery(trimmed)
  const queryTokens = tokenize(trimmed)
  const expansionTokens = new Set(expansions)

  /**
   * How much of the question this text accounts for, counting near-synonyms at
   * a discount. The one number both arms are compared against at verification.
   */
  const coverageOf = (documentTokens: Set<string>) => {
    if (queryTokens.size === 0) return 0
    let matched = 0
    for (const term of queryTokens) if (documentTokens.has(term)) matched += 1
    let related = 0
    for (const term of expansionTokens) if (documentTokens.has(term)) related += 1
    return Math.min(1, (matched + EXPANSION_CREDIT * related) / queryTokens.size)
  }

  const relatedTermsIn = (documentTokens: Set<string>) =>
    [...expansionTokens].filter((term) => documentTokens.has(term))

  trace.push({
    name: 'expand',
    kept: terms.length,
    note: expansions.length > 0 ? `+${expansions.length} near-synonyms` : 'no expansion needed',
  })

  /* 3. retrieve ---------------------------------------------------------- */

  const passageIndex = buildLexicalIndex(
    passages.map((passage) => ({ id: passage.id, text: passage.text })),
  )
  const cardIndex = buildLexicalIndex(
    cards.map((card) => ({ id: card.id, text: libraryEmbeddingText(card) })),
  )

  const passageById = new Map(passages.map((passage) => [passage.id, passage]))
  const cardById = new Map(cards.map((card) => [card.id, card]))
  const vectorById = new Map(
    (dense?.passages ?? []).map((entry) => [entry.passage.id, entry.vector]),
  )
  const cardVectorById = new Map((dense?.cards ?? []).map((entry) => [entry.card.id, entry.vector]))

  const lexicalPassages = rankLexically(passageIndex, terms, expansions)
  const lexicalCards = rankLexically(cardIndex, terms, expansions)

  const densePassages = dense
    ? [...vectorById]
        .map(([id, vector]) => ({ id, score: similarity(dense.queryVector, vector) }))
        .filter((entry) => entry.score >= MIN_RELEVANCE)
        .sort((a, b) => b.score - a.score)
    : []

  const denseCards = dense
    ? [...cardVectorById]
        .map(([id, vector]) => ({ id, score: similarity(dense.queryVector, vector) }))
        .filter((entry) => entry.score >= MIN_LIBRARY_RELEVANCE)
        .sort((a, b) => b.score - a.score)
    : []

  trace.push({
    name: 'retrieve',
    kept: lexicalPassages.terms.length + densePassages.length,
    note: dense
      ? `${densePassages.length} by meaning, ${lexicalPassages.terms.length} by words`
      : `${lexicalPassages.terms.length} by words`,
  })

  /* 4. fuse -------------------------------------------------------------- */

  const fusedPassages = reciprocalRankFusion(
    fusionInputs(densePassages, lexicalPassages),
  ).slice(0, CANDIDATE_DEPTH)

  const fusedCards = reciprocalRankFusion(fusionInputs(denseCards, lexicalCards)).slice(
    0,
    CANDIDATE_DEPTH,
  )

  trace.push({ name: 'fuse', kept: fusedPassages.length })

  /* 5. aggregate --------------------------------------------------------- */

  interface Aggregated {
    passage: Passage
    confidence: number
    cosine: number | null
    shared: string[]
    related: string[]
    chunks: number
    fused: number
  }

  const byEntry = new Map<string, Aggregated>()

  for (const entry of fusedPassages) {
    const passage = passageById.get(entry.id)
    if (!passage) continue

    const vector = vectorById.get(entry.id)
    const cosine = dense && vector ? similarity(dense.queryVector, vector) : null
    const documentTokens = tokenize(passage.text)
    const shared = sharedTerms(queryTokens, documentTokens)
    const related = relatedTermsIn(documentTokens)
    const confidence = Math.max(cosine ?? 0, coverageOf(documentTokens))

    const existing = byEntry.get(passage.entryId)
    if (!existing) {
      byEntry.set(passage.entryId, {
        passage,
        confidence,
        cosine,
        shared,
        related,
        chunks: 1,
        fused: entry.score,
      })
      continue
    }

    // Max-pool: the entry is as relevant as its best part, and a second
    // matching chunk is evidence about the entry rather than a new result.
    existing.chunks += 1
    if (confidence > existing.confidence) {
      existing.passage = passage
      existing.confidence = confidence
      existing.cosine = cosine
      existing.shared = shared
      existing.related = related
    }
    existing.fused = Math.max(existing.fused, entry.score)
  }

  trace.push({ name: 'aggregate', kept: byEntry.size, note: 'chunks folded into entries' })

  /* 6. rerank ------------------------------------------------------------ */

  const reranked = maximalMarginalRelevance(
    [...byEntry.values()].map((entry) => ({
      id: entry.passage.entryId,
      item: entry,
      relevance: entry.fused,
    })),
    {
      similarity: (a, b) => tokenSimilarity(tokenize(a.passage.text), tokenize(b.passage.text)),
      limit: MAX_PERSONAL_RESULTS,
    },
  )

  trace.push({ name: 'rerank', kept: reranked.length, note: 'near-duplicates set aside' })

  const personalCandidates: PersonalMatch[] = reranked.map(({ item }) => ({
    kind: 'personal',
    passage: item.passage,
    score: item.confidence,
    trajectory: readTrajectory(item.passage, data.moods),
    why: explainPersonal(item.shared, item.related, item.cosine, item.chunks),
  }))

  const libraryCandidates: LibraryMatch[] = fusedCards
    .map((entry) => {
      const card = cardById.get(entry.id)
      if (!card) return null
      const vector = cardVectorById.get(entry.id)
      const cosine = dense && vector ? similarity(dense.queryVector, vector) : null
      return {
        kind: 'library' as const,
        card,
        score: Math.max(cosine ?? 0, coverageOf(tokenize(libraryEmbeddingText(card)))),
      }
    })
    .filter((match): match is LibraryMatch => match !== null)
    .slice(0, MAX_LIBRARY_RESULTS)

  /* 7. verify ------------------------------------------------------------ */

  const result = verifyResult(
    { personal: personalCandidates, library: libraryCandidates },
    data,
    MIN_CONFIDENCE,
  )

  trace.push({
    name: 'verify',
    kept: result.personal.length + result.library.length,
    note:
      result.dropped.length > 0
        ? `${result.dropped.length} dropped: ${[...new Set(result.dropped.map((issue) => issue.reason))].join(', ')}`
        : 'all results traced to a stored entry or a cited source',
  })

  return {
    query: trimmed,
    risk,
    result,
    summary: summarise(
      {
        personal: result.personal,
        library: result.library,
        searchedButFoundNothing: passages.length > 0 && result.personal.length === 0,
      },
      data,
    ),
    mode,
    trace,
  }
}

/* ------------------------------------------------------------------ helpers */

interface LexicalRankings {
  terms: { id: string; score: number }[]
  expansions: { id: string; score: number }[]
}

function rankLexically(
  index: LexicalIndex,
  terms: string[],
  expansions: string[],
): LexicalRankings {
  return {
    terms: bm25Ranking(index, terms),
    expansions: expansions.length > 0 ? bm25Ranking(index, expansions) : [],
  }
}

/**
 * Three rankings go into the fusion, not two: what was typed, what it means,
 * and what it might also have been called. Keeping expansions as their own
 * weaker ranking is what stops a synonym from outranking the real word.
 */
function fusionInputs(
  denseRanking: { id: string; score: number }[],
  lexical: LexicalRankings,
): FusionInput[] {
  const inputs: FusionInput[] = [
    { ranking: lexical.terms, weight: LEXICAL_WEIGHT, label: 'words' },
  ]

  if (denseRanking.length > 0) {
    inputs.push({ ranking: denseRanking, weight: DENSE_WEIGHT, label: 'meaning' })
  }

  if (lexical.expansions.length > 0) {
    inputs.push({ ranking: lexical.expansions, weight: EXPANSION_WEIGHT, label: 'related words' })
  }

  return inputs
}
