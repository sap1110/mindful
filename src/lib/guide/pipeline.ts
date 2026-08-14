import { expandQuery } from '../echo/expand'
import { maximalMarginalRelevance, reciprocalRankFusion, tokenSimilarity } from '../echo/fuse'
import { bm25Ranking, buildLexicalIndex, overlap, tokenize } from '../echo/keyword'
import { similarity } from '../echo/retrieve'
import {
  EVIDENCE_CORPUS,
  evidenceEmbeddingText,
  type EvidenceDoc,
} from './evidence'
import { classifyIntent, type IntentResult } from './intent'
import { classifyGuideRisk, type GuideRisk } from './risk'
import { compose, composeMedicationResponse, type SafeResponse } from './compose'
import { CITATION_RELEVANCE_FLOOR, verifyResponse, type Verdict } from './verify'

/**
 * Ask's pipeline — the PRD §6 flow, end to end, on this device.
 *
 *   guard → intent → risk → retrieve (hybrid) → rerank → select
 *         → compose → verify → [pass | regenerate strictly | fall back]
 *
 * with two early exits the flow demands: HIGH risk skips retrieval entirely
 * and answers with escalation, and an unclear question resolves to a
 * clarifying question rather than a guess.
 *
 * The regenerate loop is real and deterministic: a failed verdict triggers
 * one strict recomposition (weak citations dropped), a second failure falls
 * through to a minimal template-only answer that makes no factual claims at
 * all. Fail-closed, in the direction of saying less.
 *
 * Prompt injection is not filtered here — it is inert by construction. There
 * is no prompt: the question is data to classifiers and retrievers, framing
 * text comes from a hand-written bank, and factual text comes verbatim from
 * the corpus. An instruction embedded in the question has nothing to
 * instruct, and the evaluation suite proves it stays that way.
 *
 * Everything is traced, PRD §16: what was detected, what was retrieved, what
 * the verifier scored — visible reasoning without any chain-of-thought,
 * because there is none to expose.
 */

export type AnswerKind = 'answer' | 'clarify' | 'escalate' | 'crisis' | 'fallback'

export interface GuideStage {
  name: string
  note: string
}

export interface GuideAnswer {
  query: string
  kind: AnswerKind
  intent: IntentResult
  risk: GuideRisk
  /** Present for 'answer' and 'fallback'. */
  response: SafeResponse | null
  /** The verifier's structured verdict, when composition ran. */
  verdict: Verdict | null
  /** Questions to ask back, when kind is 'clarify'. */
  clarifyingQuestions: string[]
  /** 0-1: retrieval strength blended with verification, for the UI meter. */
  confidence: number
  trace: GuideStage[]
}

export interface DenseGuideArm {
  queryVector: Float32Array
  docs: readonly { doc: EvidenceDoc; vector: Float32Array }[]
}

export interface GuidePipelineInput {
  query: string
  /** Omit to run lexical-only — the no-model path, and the CI path. */
  dense?: DenseGuideArm | null
}

/**
 * Below this best-document relevance, a symptom question asks for detail.
 *
 * Was 0.14 against a twelve-document corpus, where almost nothing cleared it
 * and every real question came back as "a little more detail first" — the bug
 * that made the feature feel broken. With the MedQuAD corpus behind it there is
 * usually something genuinely relevant, so the floor now does its actual job:
 * catching questions with no coverage at all, rather than most of them.
 */
const CLARIFY_FLOOR = 0.06
/** How many documents an answer may cite. */
const MAX_SOURCES = 3

/**
 * Content words a question needs before an unlabelled one is worth answering.
 *
 * "is this bad" is three words and one of them survives stopword removal. No
 * amount of evidence makes that answerable, and answering it anyway — which a
 * 300-document corpus will always let you do — is how a careful system starts
 * sounding like a search engine.
 */
const MIN_ANSWERABLE_WORDS = 4

const CLARIFYING_QUESTIONS = [
  'What is the main thing you are feeling or asking about, in a sentence?',
  'How long has this been going on — hours, days, or weeks?',
  'How bad is it right now, and is it getting better, worse, or staying the same?',
]

export function runGuidePipeline({ query, dense = null }: GuidePipelineInput): GuideAnswer {
  const trimmed = query.trim()
  const trace: GuideStage[] = []

  /* 1-2. guard + risk ------------------------------------------------------ */

  const risk = classifyGuideRisk(trimmed, dense?.queryVector)
  trace.push({ name: 'risk', note: `${risk.level}${risk.matched ? ` (${risk.matched})` : ''}` })

  if (risk.crisis) {
    trace.push({ name: 'route', note: 'crisis support, retrieval skipped' })
    return finish(trimmed, 'crisis', neutralIntent(), risk, null, null, [], 1, trace)
  }

  if (risk.level === 'high') {
    trace.push({ name: 'route', note: 'emergency escalation, retrieval skipped' })
    return finish(trimmed, 'escalate', neutralIntent(), risk, null, null, [], 1, trace)
  }

  /* 3. intent --------------------------------------------------------------- */

  const intent = classifyIntent(trimmed, dense?.queryVector)
  trace.push({
    name: 'intent',
    note: intent.rule
      ? `${intent.intent} (rule: ${intent.rule})`
      : `${intent.intent} — trained ${intent.features ?? 'lexical'} classifier, ` +
        `confidence ${intent.confidence.toFixed(2)}`,
  })

  if (intent.intent === 'out-of-scope') {
    trace.push({ name: 'route', note: 'outside what Mindful will answer' })
    return finish(trimmed, 'clarify', intent, risk, null, null, [
      'Mindful cannot say what condition someone has, or answer medication specifics — those need a clinician or pharmacist who can see your whole picture.',
      'It can explain what published guidance says about a symptom or topic. Would rephrasing it that way help?',
    ], 1, trace)
  }

  if (intent.intent === 'medication') {
    const response = composeMedicationResponse(risk.level)
    const verdict = verifyResponse(trimmed, response)
    trace.push({ name: 'route', note: 'medication lane: redirected, evidence-backed' })
    trace.push({ name: 'verify', note: verdictNote(verdict) })
    return finish(trimmed, 'answer', intent, risk, response, verdict, [], 0.9, trace)
  }

  /*
   * An unclear intent is no longer a refusal on its own — intent picks the
   * framing, and the evidence decides whether there is an answer. But "is this
   * bad" and "it hurts" are genuinely unanswerable, and a corpus this large
   * will always find *something* for any three words, so vagueness is measured
   * on the question rather than inferred from a failed classification.
   */
  const contentWords = tokenize(trimmed).size
  const tooVague =
    risk.level === 'unknown' ||
    (intent.intent === 'unclear' && contentWords < MIN_ANSWERABLE_WORDS)

  if (tooVague) {
    trace.push({
      name: 'route',
      note: `too little to go on (${contentWords} content words) — asking instead`,
    })
    return finish(trimmed, 'clarify', intent, risk, null, null, [...CLARIFYING_QUESTIONS], intent.confidence, trace)
  }

  /* 4-6. retrieve, fuse, rerank, select ------------------------------------- */

  const { terms, expansions } = expandQuery(trimmed)
  const index = buildLexicalIndex(
    EVIDENCE_CORPUS.map((doc) => ({ id: doc.id, text: evidenceEmbeddingText(doc) })),
  )
  const docById = new Map(EVIDENCE_CORPUS.map((doc) => [doc.id, doc]))

  const lexical = bm25Ranking(index, terms)
  const expanded = expansions.length > 0 ? bm25Ranking(index, expansions) : []
  const denseRanking = dense
    ? dense.docs
        .map((entry) => ({ id: entry.doc.id, score: similarity(dense.queryVector, entry.vector) }))
        .filter((entry) => entry.score >= 0.3)
        .sort((a, b) => b.score - a.score)
    : []

  const fused = reciprocalRankFusion([
    { ranking: lexical, weight: 0.8, label: 'words' },
    ...(denseRanking.length > 0 ? [{ ranking: denseRanking, weight: 1, label: 'meaning' }] : []),
    ...(expanded.length > 0 ? [{ ranking: expanded, weight: 0.35, label: 'related words' }] : []),
  ])

  const queryTokens = tokenize(trimmed)
  const relevanceOf = (doc: EvidenceDoc) =>
    Math.max(
      overlap(queryTokens, tokenize(evidenceEmbeddingText(doc))),
      dense
        ? similarity(
            dense.queryVector,
            dense.docs.find((entry) => entry.doc.id === doc.id)?.vector ?? new Float32Array(),
          )
        : 0,
    )

  const reranked = maximalMarginalRelevance(
    fused
      .map((entry) => ({ id: entry.id, item: docById.get(entry.id)!, relevance: entry.score }))
      .filter((entry) => entry.item),
    {
      similarity: (a, b) => tokenSimilarity(tokenize(a.body), tokenize(b.body)),
      limit: MAX_SOURCES,
    },
  )

  /*
   * Order comes from fusion and re-ranking; `relevance` is only a coverage
   * score for the confidence floor.
   *
   * These were conflated once, by re-sorting the fused list on word overlap —
   * which quietly undid BM25. "I keep getting headaches after long days at
   * work" put a dizziness document first, because it shared "long", "days",
   * "work" and "help" with the question while the headache document shared
   * only "headache": four common words beating one rare one is the exact
   * failure IDF exists to prevent.
   */
  const selected = reranked
    .map(({ item }) => ({ doc: item, relevance: relevanceOf(item) }))
    .filter((entry) => entry.relevance >= CITATION_RELEVANCE_FLOOR)

  const topRelevance = selected.reduce((best, entry) => Math.max(best, entry.relevance), 0)
  trace.push({
    name: 'retrieve',
    note: `${selected.length} of ${EVIDENCE_CORPUS.length} documents selected, ${dense ? 'hybrid' : 'by words'}, best ${topRelevance.toFixed(2)}`,
  })

  if (selected.length === 0 || topRelevance < CLARIFY_FLOOR) {
    trace.push({ name: 'route', note: 'nothing in the evidence base covers this — asking instead' })
    return finish(trimmed, 'clarify', intent, risk, null, null, [...CLARIFYING_QUESTIONS], topRelevance, trace)
  }

  /* 7-8. compose, verify, regenerate ---------------------------------------- */

  let response = compose({ intent: intent.intent, risk: risk.level, selected })
  let verdict = verifyResponse(trimmed, response)
  trace.push({ name: 'verify', note: verdictNote(verdict) })

  if (verdict.status !== 'pass') {
    response = compose({ intent: intent.intent, risk: risk.level, selected, strict: true })
    verdict = verifyResponse(trimmed, response)
    trace.push({ name: 'verify (strict)', note: verdictNote(verdict) })
  }

  if (verdict.status !== 'pass') {
    // Fail closed: say less. A template-only answer with no factual claims,
    // pointing at professional routes, is the floor the pipeline cannot fall
    // below.
    trace.push({ name: 'route', note: 'verification failed twice — minimal safe answer' })
    const fallback = compose({ intent: intent.intent, risk: risk.level, selected: [] })
    return finish(trimmed, 'fallback', intent, risk, fallback, verdict, [], 0.2, trace)
  }

  // A verified answer that ended up citing nothing is not an answer. This
  // cannot normally happen now that strict mode keeps its best document, and
  // it is caught here rather than trusted not to.
  if (response.sources.length === 0) {
    trace.push({ name: 'route', note: 'no citation survived — asking instead of answering emptily' })
    return finish(trimmed, 'clarify', intent, risk, null, verdict, [...CLARIFYING_QUESTIONS], topRelevance, trace)
  }

  const confidence = Math.min(
    1,
    0.5 * Math.min(1, topRelevance / 0.5) + 0.5 * verdict.evidenceSupport * verdict.citationAccuracy,
  )

  return finish(trimmed, 'answer', intent, risk, response, verdict, [], confidence, trace)
}

/* -------------------------------------------------------------- plumbing */

function finish(
  query: string,
  kind: AnswerKind,
  intent: IntentResult,
  risk: GuideRisk,
  response: SafeResponse | null,
  verdict: Verdict | null,
  clarifyingQuestions: string[],
  confidence: number,
  trace: GuideStage[],
): GuideAnswer {
  return { query, kind, intent, risk, response, verdict, clarifyingQuestions, confidence, trace }
}

function neutralIntent(): IntentResult {
  return { intent: 'unclear', confidence: 0, rule: 'skipped' }
}

function verdictNote(verdict: Verdict): string {
  return `${verdict.status} — support ${verdict.evidenceSupport.toFixed(2)}, hallucination ${verdict.hallucinationRisk.toFixed(2)}, citations ${verdict.citationAccuracy.toFixed(2)}${
    verdict.scopeViolations.length > 0 ? `, scope: ${verdict.scopeViolations.join('/')}` : ''
  }`
}
