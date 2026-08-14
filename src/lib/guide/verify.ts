import { overlap, tokenize } from '../echo/keyword'
import { evidenceDoc, evidenceEmbeddingText } from './evidence'
import type { SafeResponse } from './compose'

/**
 * Independent verification — PRD §13-14.
 *
 * The verifier re-derives everything from scratch. It does not trust the
 * composer's structure, its citations, or its self-restraint: it takes the
 * finished response, the original question, and the evidence corpus, and asks
 * the PRD's questions with its own methods —
 *
 *   grounding    is every evidence-tagged sentence literally present in the
 *                document it cites? Checked by flattened-substring match
 *                against the corpus, not against anything the composer says.
 *                A sentence that fails is a hallucination *by definition* in
 *                this architecture, whatever produced it.
 *   citation     does each cited document actually pertain to the question?
 *                A true quote from an irrelevant document is not support.
 *   scope        does any sentence — framing included — diagnose, dose, or
 *                promise? Framing is hand-written today; the check exists for
 *                the day someone edits the templates.
 *   uncertainty  does the response say what it does not know? Required, not
 *                encouraged.
 *
 * The output is the PRD's structured verdict: numeric scores, a status, and
 * named issues, so a failure is a diagnosis rather than a shrug. The pipeline
 * acts on the status — pass, regenerate (strict recompose), or fall back to a
 * minimal safe answer — and the whole loop is deterministic and testable,
 * including the failure paths, which the test suite exercises by feeding this
 * function deliberately corrupted responses.
 */

export type VerdictStatus = 'pass' | 'regenerate'

export interface Verdict {
  status: VerdictStatus
  /** Fraction of evidence claims literally present in their cited document. */
  evidenceSupport: number
  /** Fraction of evidence claims that are NOT grounded — 0 is the invariant. */
  hallucinationRisk: number
  /** Fraction of citations whose document actually pertains to the question. */
  citationAccuracy: number
  /** Scope-violation matches, empty when clean. */
  scopeViolations: string[]
  uncertaintyStated: boolean
  /** Human-readable reasons for anything less than a clean pass. */
  issues: string[]
}

/** A cited document must clear this against the question to count as support. */
const CITATION_RELEVANCE_FLOOR = 0.12

/**
 * Language no response may contain, whatever wrote it. Deliberately blunt:
 * these patterns cost false positives in exchange for making "the app
 * diagnosed me" and "the app dosed me" structurally unreachable.
 */
const SCOPE_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['diagnosis-assertion', /\byou\s+(clearly\s+|probably\s+|definitely\s+)?(have|are\s+suffering\s+from)\s+(?!to\b|a\s+few|questions)/i],
  ['dosage', /\b\d+\s?(mg|ml|mcg|milligrams?|millilitres?)\b|\btake\s+\d+\s+(tablets?|pills?|capsules?)\b/i],
  ['promise', /\b(will\s+cure|guaranteed\s+to|will\s+definitely\s+(fix|heal|cure))\b/i],
  ['replace-care', /\b(no\s+need\s+(to\s+)?(see|visit)\s+a\s+(doctor|gp|clinician)|instead\s+of\s+medical\s+(care|advice))\b/i],
]

/** Whitespace differs; nothing else may. Same rule as Echo's verifier. */
function flatten(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function verifyResponse(query: string, response: SafeResponse): Verdict {
  const issues: string[] = []
  const queryTokens = tokenize(query)

  const evidenceClaims = [...response.directAnswer, ...response.evidenceSays].filter(
    (claim) => claim.kind === 'evidence',
  )

  // Grounding: independently against the corpus, never against the composer.
  let grounded = 0
  let relevantCitations = 0
  for (const claim of evidenceClaims) {
    const doc = claim.docId ? evidenceDoc(claim.docId) : undefined

    if (!doc) {
      issues.push(`claim cites a document that does not exist: "${claim.text.slice(0, 60)}…"`)
      continue
    }

    if (flatten(`${doc.title} ${doc.body}`).includes(flatten(claim.text))) {
      grounded += 1
    } else {
      issues.push(`claim is not present in its cited document (${doc.id})`)
    }

    if (overlap(queryTokens, tokenize(evidenceEmbeddingText(doc))) >= CITATION_RELEVANCE_FLOOR) {
      relevantCitations += 1
    } else {
      issues.push(`cited document ${doc.id} does not pertain to the question`)
    }
  }

  const evidenceSupport = evidenceClaims.length === 0 ? 1 : grounded / evidenceClaims.length
  const hallucinationRisk = 1 - evidenceSupport
  const citationAccuracy =
    evidenceClaims.length === 0 ? 1 : relevantCitations / evidenceClaims.length

  // Scope: every sentence, framing included.
  const allText = [
    ...response.directAnswer.map((claim) => claim.text),
    ...response.evidenceSays.map((claim) => claim.text),
    ...response.uncertainties,
    ...response.nextSteps.map((step) => step.text),
    ...response.seekHelp,
  ].join('\n')

  const scopeViolations: string[] = []
  for (const [name, pattern] of SCOPE_PATTERNS) {
    if (pattern.test(allText)) {
      scopeViolations.push(name)
      issues.push(`scope violation: ${name}`)
    }
  }

  const uncertaintyStated = response.uncertainties.length > 0
  if (!uncertaintyStated) issues.push('no uncertainty stated')

  const status: VerdictStatus =
    hallucinationRisk === 0 &&
    citationAccuracy >= 0.99 &&
    scopeViolations.length === 0 &&
    uncertaintyStated
      ? 'pass'
      : 'regenerate'

  return {
    status,
    evidenceSupport,
    hallucinationRisk,
    citationAccuracy,
    scopeViolations,
    uncertaintyStated,
    issues,
  }
}
