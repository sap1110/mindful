import { expect, test } from '@playwright/test'
import { EVAL_QUERIES, evaluate, evaluationData, formatReport } from '../src/lib/echo/evaluation'
import { buildCorpus } from '../src/lib/echo/corpus'
import { runPipeline } from '../src/lib/echo/pipeline'
import { reciprocalRankFusion, maximalMarginalRelevance, tokenSimilarity } from '../src/lib/echo/fuse'
import { bm25Ranking, buildLexicalIndex, tokenize, tokenList } from '../src/lib/echo/keyword'

/**
 * Echo's retrieval, measured rather than eyeballed.
 *
 * These run in Node against the pipeline modules directly — no browser, no
 * model, no 23MB download — because the lexical arm and every stage built on
 * top of it are pure functions over data. That is deliberate: retrieval quality
 * has to be cheap to check on every change, or it stops being checked.
 */

test.describe('retrieval quality', () => {
  test('finds the right entry, and finds it first', () => {
    const report = evaluate()
    console.log(`\n${formatReport(report)}\n`)

    // Floors, not targets. They exist to catch a regression, so they sit below
    // where the pipeline currently scores rather than at it.
    expect(report.recall).toBeGreaterThanOrEqual(0.8)
    expect(report.mrr).toBeGreaterThanOrEqual(0.75)
  })

  test('works about as well however someone writes', () => {
    const report = evaluate()

    // The three literal registers are the fairness claim: clipped phone typing
    // and second-language phrasing must not retrieve worse than tidy prose.
    const literal = ['plain', 'informal', 'second-language'] as const
    for (const register of literal) {
      expect(
        report.byRegister[register].recall,
        `${register} recall@3 fell below the floor`,
      ).toBeGreaterThanOrEqual(0.9)
    }

    const scores = literal.map((register) => report.byRegister[register].recall)
    const gap = Math.max(...scores) - Math.min(...scores)
    expect(gap, 'retrieval favours one way of writing over another').toBeLessThanOrEqual(0.15)
  })

  test('the contraction folding is what makes that parity possible', () => {
    // "cant" and "can't" and "cannot" are one word, whatever the keyboard did.
    expect([...tokenize("I can't sleep")]).toEqual([...tokenize('I cannot sleep')])
    expect([...tokenize('i dont want to')]).toEqual([...tokenize('I do not want to')])
    expect(tokenList('cos im knackered')).toContain('knacker')
  })
})

test.describe('ranking mechanics', () => {
  test('BM25 weights a rare word above a common one', () => {
    const index = buildLexicalIndex([
      { id: 'a', text: 'work was hard today and work is always hard' },
      { id: 'b', text: 'work was hard today too, more work' },
      { id: 'c', text: 'work was hard but I heard a harpsichord in the square' },
    ])

    const [top] = bm25Ranking(index, tokenList('harpsichord work'))
    expect(top.id).toBe('c')
  })

  test('fusion rewards agreement between the two retrievers', () => {
    const fused = reciprocalRankFusion([
      { label: 'meaning', weight: 1, ranking: [{ id: 'x', score: 0.9 }, { id: 'y', score: 0.8 }] },
      { label: 'words', weight: 0.8, ranking: [{ id: 'y', score: 4 }, { id: 'z', score: 3 }] },
    ])

    // y is second and first; x is first and absent. Agreement wins.
    expect(fused[0].id).toBe('y')
    expect(fused[0].positions).toEqual({ meaning: 2, words: 1 })
  })

  test('re-ranking never costs someone their best match', () => {
    const items = [
      { id: 'a', item: new Set(['sleep', 'work']), relevance: 0.9 },
      { id: 'b', item: new Set(['sleep', 'work']), relevance: 0.88 },
      { id: 'c', item: new Set(['walk', 'canal']), relevance: 0.5 },
    ]

    const chosen = maximalMarginalRelevance(items, {
      similarity: tokenSimilarity,
      limit: 2,
    })

    // The top result is always the top result; the near-duplicate makes way.
    expect(chosen[0].id).toBe('a')
    expect(chosen[1].id).toBe('c')
  })
})

test.describe('the verification layer', () => {
  test('drops a result whose entry has been deleted since the index was built', () => {
    const data = evaluationData()
    const passages = buildCorpus(data)

    // The index still holds the entry; storage no longer does.
    const afterDeletion = {
      ...data,
      journal: data.journal.filter((entry) => entry.id !== 'e-sleep'),
    }

    const answer = runPipeline({
      query: 'I cannot sleep because I am worrying about work',
      passages,
      data: afterDeletion,
    })

    expect(answer.result?.personal.map((match) => match.passage.entryId)).not.toContain('e-sleep')
    expect(answer.result?.dropped.some((issue) => issue.reason === 'provenance-missing')).toBe(true)
  })

  test('drops text that is not verbatim in the stored entry', () => {
    const data = evaluationData()
    const passages = buildCorpus(data).map((passage) =>
      passage.entryId === 'e-money'
        ? { ...passage, text: `${passage.text} and I have decided to sell the car.` }
        : passage,
    )

    const answer = runPipeline({
      query: 'I am avoiding looking at my bills and the rent',
      passages,
      data,
    })

    expect(answer.result?.personal.map((match) => match.passage.entryId)).not.toContain('e-money')
    expect(answer.result?.dropped.some((issue) => issue.reason === 'not-verbatim')).toBe(true)
  })

  test('shows at most one card from any single source', () => {
    const answer = runPipeline({
      query: 'I feel anxious and cannot sleep and everything is too much',
      passages: [],
      data: { journal: [], moods: [], breathing: [], screeners: [] },
    })

    const sources = (answer.result?.library ?? []).map((match) => match.card.source)
    expect(new Set(sources).size).toBe(sources.length)
  })

  test('a crisis disclosure never reaches the retriever', () => {
    const data = evaluationData()
    const answer = runPipeline({
      query: 'I do not want to be here anymore',
      passages: buildCorpus(data),
      data,
    })

    expect(answer.risk.level).toBe('acute')
    expect(answer.result).toBeNull()
    expect(answer.trace).toHaveLength(1)
  })

  test('every stage of the pipeline reports what it did', () => {
    const data = evaluationData()
    const answer = runPipeline({
      query: EVAL_QUERIES[0].text,
      passages: buildCorpus(data),
      data,
    })

    expect(answer.trace.map((stage) => stage.name)).toEqual([
      'guard',
      'expand',
      'retrieve',
      'fuse',
      'aggregate',
      'rerank',
      'verify',
    ])
  })
})
