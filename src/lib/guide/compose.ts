import type { HealthIntent } from './intent'
import type { RiskLevel } from './risk'
import { evidenceDoc, type EvidenceDoc } from './evidence'

/**
 * Response composition — the PRD's "generation model", built extractively.
 *
 * The PRD's central principle is "generate less, verify more", and this stage
 * takes it literally: it does not generate free-form text at all. Every
 * sentence in an answer is one of exactly two things —
 *
 *   `evidence` claims: text lifted from an evidence document, carrying the id
 *   of the document it came from. The verifier can — and does — check that
 *   the text really is in that document, which makes fabricated claims a
 *   structural impossibility rather than a filtered rarity.
 *
 *   `framing` sentences: hand-written connective tissue from the template
 *   bank below, keyed by intent and risk. Framing never states a medical
 *   fact; it introduces, hedges, and routes. The verifier holds it to that
 *   with a scope check.
 *
 * Why not an LLM? A cloud model would ship the person's health question to a
 * third-party API — the exact thing this app promises never happens — and a
 * small on-device generator is most fluent precisely where it is least
 * reliable. An extractive composer is less articulate and cannot lie, and in
 * this domain that is the right trade. The PRD itself says the model should
 * be chosen on benchmark results, not size; this one benchmarks at a
 * hallucination rate of zero by construction, and the verifier exists to keep
 * it there when someone edits this file.
 */

/** One sentence of an answer, tagged with what it is allowed to be. */
export interface Claim {
  text: string
  kind: 'evidence' | 'framing'
  /** The document an evidence claim is lifted from. Framing carries none. */
  docId?: string
}

/** The PRD §15 safe-response format, section by section. */
export interface SafeResponse {
  directAnswer: Claim[]
  evidenceSays: Claim[]
  uncertainties: string[]
  nextSteps: { text: string; inApp?: { label: string; to: string } }[]
  seekHelp: string[]
  /** The documents cited, deduped, in citation order. */
  sources: EvidenceDoc[]
}

export interface ComposeInput {
  intent: HealthIntent
  risk: RiskLevel
  /** Retrieval's selection, best first, with its relevance per document. */
  selected: readonly { doc: EvidenceDoc; relevance: number }[]
  /** Strict mode drops weaker citations — the regenerate path uses it. */
  strict?: boolean
}

/**
 * In strict mode, weaker citations are dropped rather than defended — but the
 * best one always survives.
 *
 * The first version dropped everything below a fixed 0.3, which on a real
 * question scoring 0.29 produced an "answer" citing nothing at all: technically
 * verified, completely useless. Strict mode is meant to tighten a response, not
 * hollow it out. If the best evidence is genuinely too weak, that is the
 * pipeline's job to notice — and it does, by routing to a clarifying question
 * instead of composing at all.
 */
const STRICT_RELEVANCE = 0.2

/* ------------------------------------------------------------- templates */

const OPENERS: Partial<Record<HealthIntent, string>> = {
  symptom: 'Here is what published guidance says about this — as general information, not an assessment of you.',
  'general-health': 'Here is what published guidance says.',
  recovery: 'Here is what the recovery guidance says, in general terms.',
  'mental-health': 'Here is what published guidance says — and however this reads, what you are feeling is worth taking seriously.',
  preventive: 'Here is what published guidance recommends.',
  'diagnosis-explanation': 'Here is how the published guidance explains it — your own clinician remains the authority on what it means for you.',
}

const NEXT_STEPS: Partial<Record<HealthIntent, { text: string; inApp?: { label: string; to: string } }[]>> = {
  symptom: [
    { text: 'Note when it started, what makes it better or worse, and anything that came with it — that record is most of what a professional will ask for.' },
    { text: 'A pharmacist is a fast, qualified first stop for everyday symptoms.' },
  ],
  'mental-health': [
    { text: 'A validated self-check can put a number on how the last two weeks have actually been.', inApp: { label: 'Take a PHQ-9 or GAD-7', to: '/self-check' } },
    { text: 'A few minutes of paced breathing is a reasonable next five minutes.', inApp: { label: 'Breathe', to: '/breathe' } },
  ],
  recovery: [
    { text: 'Mindful can pace a graduated return and keep the symptom record a clinician will want.', inApp: { label: 'Open Recovery', to: '/recovery' } },
  ],
  preventive: [
    { text: 'Small and consistent beats large and abandoned — pick the smallest version you would actually repeat.' },
  ],
}

const SEEK_HELP: Record<RiskLevel, string[]> = {
  low: [
    'If this persists, keeps coming back, or simply worries you, that is a good enough reason to ask a pharmacist or clinician — professionals expect these questions and would rather hear them early.',
  ],
  moderate: [
    'What you describe — how long it has lasted, or who it affects — is worth putting to a clinician rather than managing alone. This is exactly what GPs and pharmacists are for.',
    'If it suddenly worsens, or any emergency sign appears, treat it as urgent rather than waiting for an appointment.',
  ],
  high: [
    'What you describe can be an emergency. Contact your local emergency number or go to an emergency department now — do not wait to see if it passes, and do not drive yourself.',
  ],
  unknown: [
    'If anything about this feels urgent or is getting worse, contact a clinician now rather than refining the question.',
  ],
}

const ALWAYS_UNCERTAIN =
  'This is general published guidance, not an assessment of you: Mindful cannot examine anyone, and it does not know your history, medication, or circumstances.'

/* --------------------------------------------------------------- helpers */

/** The first sentence of a body, or the whole body when splitting is unsafe. */
export function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]{20,}?[.!?](?=\s|$)/)
  return match ? match[0].trim() : text.trim()
}

/* --------------------------------------------------------------- compose */

export function compose({ intent, risk, selected, strict = false }: ComposeInput): SafeResponse {
  const strictlyUsable = selected.filter((entry) => entry.relevance >= STRICT_RELEVANCE)
  const usable = strict
    ? // Never fewer than the single best document: an answer citing nothing is
      // not a safer answer, it is an empty one.
      strictlyUsable.length > 0
      ? strictlyUsable
      : selected.slice(0, 1)
    : [...selected]

  const top = usable[0]
  const directAnswer: Claim[] = []

  const opener = OPENERS[intent] ?? OPENERS['general-health']!
  directAnswer.push({ text: opener, kind: 'framing' })

  if (top) {
    directAnswer.push({
      text: firstSentence(top.doc.body),
      kind: 'evidence',
      docId: top.doc.id,
    })
  } else {
    directAnswer.push({
      text: 'Mindful’s evidence base does not cover this well enough to answer responsibly, and a made-up answer would be worse than none.',
      kind: 'framing',
    })
  }

  // The evidence section: each cited document speaks in full, attributed.
  const evidenceSays: Claim[] = usable.slice(0, 3).map((entry) => ({
    text: entry.doc.body,
    kind: 'evidence' as const,
    docId: entry.doc.id,
  }))

  const uncertainties: string[] = [ALWAYS_UNCERTAIN]
  if (!top) {
    uncertainties.push(
      'Nothing in the evidence base matched this question closely, so no factual claims are being made about it.',
    )
  } else if (top.relevance < 0.5) {
    uncertainties.push(
      'The match between this question and the available evidence is only partial — treat this as adjacent guidance rather than a direct answer.',
    )
  }
  if (intent === 'symptom') {
    uncertainties.push(
      'The same symptom can have many causes, and telling them apart needs an examination — which is precisely what this is not.',
    )
  }

  const nextSteps = [...(NEXT_STEPS[intent] ?? [])]
  if (nextSteps.length === 0) {
    nextSteps.push({
      text: 'If you want to go deeper, the cited sources below are the originals — each link is the actual guidance, not a summary of it.',
    })
  }

  const sources = dedupeSources([
    ...evidenceSays.map((claim) => claim.docId),
    ...directAnswer.map((claim) => claim.docId),
  ])

  return {
    directAnswer,
    evidenceSays,
    uncertainties,
    nextSteps,
    seekHelp: [...SEEK_HELP[risk]],
    sources,
  }
}

/**
 * The lane for medication questions: never answered, always redirected, and
 * still evidence-backed — the redirection itself cites the medicines-safety
 * guidance rather than being a bare refusal.
 */
export function composeMedicationResponse(risk: RiskLevel): SafeResponse {
  const doc = evidenceDoc('medication-safety')
  return {
    directAnswer: [
      {
        text: 'Mindful does not answer questions about doses, mixing medicines, or starting or stopping a prescription — not because the question is wrong, but because answering it safely needs your full picture, which only your prescriber or a pharmacist has.',
        kind: 'framing',
      },
    ],
    evidenceSays: doc ? [{ text: doc.body, kind: 'evidence', docId: doc.id }] : [],
    uncertainties: [ALWAYS_UNCERTAIN],
    nextSteps: [
      { text: 'A pharmacist can answer most medicine questions on the spot, without an appointment, and will say when it needs the prescriber instead.' },
    ],
    seekHelp: [...SEEK_HELP[risk === 'high' ? 'high' : 'moderate']],
    sources: doc ? [doc] : [],
  }
}

function dedupeSources(ids: readonly (string | undefined)[]): EvidenceDoc[] {
  const seen = new Set<string>()
  const docs: EvidenceDoc[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    const doc = evidenceDoc(id)
    if (doc) docs.push(doc)
  }
  return docs
}
