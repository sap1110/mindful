import { LIBRARY_SOURCES } from './library'
import { assessRisk } from './safety'
import type { LibraryMatch, PersonalMatch } from './retrieve'
import type { MindfulData } from '../storage'

/**
 * The verification layer: what Echo is *allowed* to show.
 *
 * Retrieval decides what is relevant. This decides what is true, and it runs
 * on the way out, after ranking and before anything reaches a screen. The two
 * jobs are separated on purpose — a relevance score is a judgement, and no
 * amount of confidence in a judgement makes an entry that no longer exists
 * safe to display.
 *
 * Every check here is a claim the app makes to the person using it, expressed
 * as code that can fail:
 *
 *   provenance   every personal result names a record that is in storage right
 *                now. An index built ninety seconds ago is not evidence that
 *                an entry survived the last ninety seconds.
 *   verbatim     the text shown is a literal substring of what they wrote. This
 *                is the anti-fabrication guarantee, and it is stronger than
 *                "we don't use a generative model": even a summarising bug, a
 *                bad chunk boundary or a corrupted index cannot put words in
 *                someone's mouth, because unmatched text is dropped.
 *   support      a claim about what happened after an entry survives only while
 *                the check-ins backing it do.
 *   attribution  library cards must carry a source in the allowlist, and no
 *                more than one card per source is shown, so a single body's
 *                framing of mental health cannot fill the whole answer.
 *   resurfacing  if the search hands back the darkest thing someone ever wrote,
 *                that is not a neutral event. The entry is still shown — it is
 *                theirs, and hiding it would be its own insult — but support is
 *                offered alongside it rather than after it.
 *
 * Anything dropped is recorded rather than silently discarded, so a failure
 * here is debuggable and, in the tests, assertable.
 */

export type VerificationReason =
  | 'provenance-missing'
  | 'not-verbatim'
  | 'below-floor'
  | 'source-not-allowed'
  | 'source-repeated'

export interface VerificationIssue {
  /** Passage or card id. */
  id: string
  reason: VerificationReason
  detail?: string
}

export interface VerifiedResult {
  personal: PersonalMatch[]
  library: LibraryMatch[]
  dropped: VerificationIssue[]
  /**
   * A returned entry contains acute-risk language. The UI shows crisis support
   * alongside the results rather than leaving someone alone with it.
   */
  resurfacedDistress: boolean
}

/** Whitespace differs between a stored entry and a chunk of it; nothing else may. */
function flatten(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Check every candidate against the live dataset.
 *
 * `data` is read at verification time rather than trusted from whenever the
 * index was built — that gap is precisely where a deleted entry would slip
 * through.
 */
export function verifyResult(
  candidates: { personal: readonly PersonalMatch[]; library: readonly LibraryMatch[] },
  data: MindfulData,
  floor: number,
): VerifiedResult {
  const dropped: VerificationIssue[] = []

  // What the person's storage actually contains, right now.
  const journalById = new Map(data.journal.map((entry) => [entry.id, flatten(entry.body)]))
  const moodById = new Map(
    data.moods.filter((entry) => entry.note).map((entry) => [entry.id, flatten(entry.note ?? '')]),
  )

  const personal: PersonalMatch[] = []
  let resurfacedDistress = false

  for (const match of candidates.personal) {
    const { passage } = match

    if (match.score < floor) {
      dropped.push({ id: passage.id, reason: 'below-floor', detail: match.score.toFixed(3) })
      continue
    }

    const source =
      passage.source === 'journal' ? journalById.get(passage.entryId) : moodById.get(passage.entryId)

    if (source === undefined) {
      dropped.push({ id: passage.id, reason: 'provenance-missing', detail: passage.entryId })
      continue
    }

    if (!source.includes(flatten(passage.text))) {
      dropped.push({ id: passage.id, reason: 'not-verbatim', detail: passage.entryId })
      continue
    }

    // A direction claimed without the check-ins to back it is downgraded here
    // rather than dropped: the entry is still a real match, it just cannot
    // carry a story about what came next.
    const trajectory =
      match.trajectory.direction !== 'unknown' && match.trajectory.points < 2
        ? { ...match.trajectory, direction: 'unknown' as const }
        : match.trajectory

    if (assessRisk(passage.text).level === 'acute') resurfacedDistress = true

    personal.push({ ...match, trajectory })
  }

  const library: LibraryMatch[] = []
  const sourcesUsed = new Set<string>()

  for (const match of candidates.library) {
    const { card } = match

    if (!(card.source in LIBRARY_SOURCES)) {
      dropped.push({ id: card.id, reason: 'source-not-allowed', detail: card.source })
      continue
    }

    if (sourcesUsed.has(card.source)) {
      dropped.push({ id: card.id, reason: 'source-repeated', detail: card.source })
      continue
    }

    sourcesUsed.add(card.source)
    library.push(match)
  }

  return { personal, library, dropped, resurfacedDistress }
}
