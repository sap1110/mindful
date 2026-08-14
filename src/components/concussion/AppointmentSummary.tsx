import { Printer } from 'lucide-react'
import { CONCUSSION_SYMPTOMS, MAX_TOTAL_SEVERITY, scoreSymptoms } from '../../lib/concussion/symptoms'
import { currentStage, stagesFor, type ProtocolState } from '../../lib/concussion/protocol'
import type { SymptomCheck } from '../../lib/storage'
import { formatLongDay, formatShortDay, todayISO } from '../../lib/date'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export interface AppointmentSummaryProps {
  checks: readonly SymptomCheck[]
  protocol: ProtocolState | null
}

/** How many recent checks the summary shows. Two-plus weeks of dailies. */
const SUMMARY_CHECKS = 14

const SYMPTOM_LABEL = new Map(CONCUSSION_SYMPTOMS.map((symptom) => [symptom.id, symptom.label]))

/**
 * The clinician handoff.
 *
 * A ten-minute appointment starts with three questions — how bad, which
 * symptoms, and which way is it going — and the honest answer to all three is
 * a table nobody can reconstruct from memory. This renders that table from the
 * stored checks, adds where the person is on the return ladder and since when,
 * and prints onto one sheet with everything else on the page suppressed.
 *
 * Deliberately dry. No colour coding, no interpretation, no "your recovery
 * score": the reading belongs to the clinician, and a summary that editorialises
 * is a summary that has to be second-guessed. What Mindful adds is only what it
 * genuinely knows — dates, numbers, and the stage rules the person was pacing
 * themselves against.
 *
 * Print, not a file download, because print-to-PDF is universal and a paper
 * copy is still the most interoperable medical document format there is.
 */
export function AppointmentSummary({ checks, protocol }: AppointmentSummaryProps) {
  const recent = checks.slice(0, SUMMARY_CHECKS)
  const latest = recent[0]

  function handlePrint() {
    document.body.classList.add('printing-summary')
    const cleanup = () => {
      document.body.classList.remove('printing-summary')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
    // Browsers that never fire afterprint still get the class removed.
    window.setTimeout(cleanup, 2_000)
  }

  const worstAtLatest = latest
    ? Object.entries(latest.answers)
        .filter(([, rating]) => rating > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : []

  return (
    <Card tone="raised" padding="md" id="appointment-summary" as="section" aria-label="Appointment summary">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-sans text-lg font-medium text-text">For your appointment</h3>
          <p className="mt-1 max-w-prose text-sm text-text-muted">
            The record below is what a clinician will ask for first. Print it, or save it as a PDF
            from the print dialogue — it is generated on this device and goes only where you take
            it.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          iconLeft={<Printer className="h-4 w-4" />}
          onClick={handlePrint}
          className="print:hidden"
        >
          Print this summary
        </Button>
      </div>

      <div className="mt-5 space-y-5 text-sm">
        <p className="text-text-muted">
          Symptom record from Mindful, prepared {formatLongDay(todayISO())}. Scale: 22 symptoms,
          each rated 0–6; totals out of {MAX_TOTAL_SEVERITY}. Self-reported, on the person&rsquo;s
          own device. Not a diagnosis.
        </p>

        {recent.length === 0 ? (
          <p className="text-text-muted">
            No symptom checks recorded yet — the table fills in as daily checks are saved.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left tabular-nums">
              <caption className="sr-only">
                Daily symptom check totals, most recent first
              </caption>
              <thead>
                <tr className="border-b border-border-strong text-xs uppercase tracking-[0.08em] text-text-subtle">
                  <th scope="col" className="py-2 pr-4 font-semibold">Date</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Total</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Symptoms</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Physical</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Cognitive</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Emotional</th>
                  <th scope="col" className="py-2 font-semibold">Sleep</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((check) => {
                  const domains = scoreSymptoms(check.answers).byDomain
                  return (
                    <tr key={check.id} className="border-b border-border text-text">
                      <th scope="row" className="py-2 pr-4 font-medium">
                        {formatShortDay(check.date)}
                      </th>
                      <td className="py-2 pr-4">{check.severity}</td>
                      <td className="py-2 pr-4">{check.count} of 22</td>
                      <td className="py-2 pr-4">{domains.physical}</td>
                      <td className="py-2 pr-4">{domains.cognitive}</td>
                      <td className="py-2 pr-4">{domains.emotional}</td>
                      <td className="py-2">{domains.sleep}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {worstAtLatest.length > 0 ? (
          <p className="max-w-prose text-text-muted">
            <span className="font-medium text-text">Most affected at the last check:</span>{' '}
            {worstAtLatest
              .map(([id, rating]) => `${SYMPTOM_LABEL.get(id) ?? id} (${rating}/6)`)
              .join(' · ')}
          </p>
        ) : null}

        <p className="max-w-prose text-text-muted">
          <span className="font-medium text-text">Return plan:</span>{' '}
          {protocol
            ? `${protocol.track === 'learn' ? 'Return to learning/work' : 'Return to sport'} — stage ${
                protocol.stage
              } of ${stagesFor(protocol.track).length} (${currentStage(protocol).name}), at this stage since ${formatLongDay(
                protocol.startedAt.slice(0, 10),
              )}. ${
                protocol.track === 'sport'
                  ? protocol.clinicianCleared
                    ? 'Recorded as cleared for contact by a clinician.'
                    : 'Not cleared for contact.'
                  : ''
              }`
            : 'No graduated return plan is being tracked.'}
        </p>

        <p className="max-w-prose text-text-subtle">
          Protocol: graduated return per the Amsterdam 2023 consensus — minimum 24 hours per
          stage, no more than mild and brief symptom exacerbation, baseline before contact stages,
          clinician clearance before full contact.
        </p>
      </div>
    </Card>
  )
}

export default AppointmentSummary
