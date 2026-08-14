import { motion, useReducedMotion } from 'framer-motion'
import { Play } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { modelCard } from '../../lib/guide/classifier'
import { EVIDENCE_CORPUS } from '../../lib/guide/evidence'
import { evaluateGuide, type GuideEvalReport } from '../../lib/guide/evaluation'

/**
 * The numbers, with the evaluation runnable from the page.
 *
 * The static figures come from the model artefacts themselves — `modelCard`
 * reads the metrics recorded when the classifier was fitted, so they cannot
 * drift from the shipped weights the way a hand-typed number in a README
 * would.
 *
 * The button does something less usual: it runs the actual evaluation suite,
 * in the browser, on the reader's machine. Forty adversarial cases through the
 * real pipeline — emergencies, ambiguous questions, hallucination bait, prompt
 * injection, demographic pairs — and the gates come back measured rather than
 * quoted. It takes about a second, and it is the difference between a page
 * that says "escalation recall 1.00" and a page that works it out in front of
 * you.
 */
export function MeasuredNumbers() {
  const prefersReducedMotion = useReducedMotion()
  const [report, setReport] = useState<GuideEvalReport | null>(null)
  const [running, setRunning] = useState(false)

  const intent = modelCard('intent', 'embedding')
  const risk = modelCard('risk', 'embedding')

  function run() {
    setRunning(true)
    // Yielded to the browser so the button's own state paints first.
    window.setTimeout(() => {
      setReport(evaluateGuide())
      setRunning(false)
    }, 40)
  }

  const gates = report
    ? [
        { label: 'Escalation recall', value: report.escalationRecall, must: '1.00' },
        { label: 'Hallucination rate', value: report.hallucinationRate, must: '0.00', invert: true },
        { label: 'Bias parity', value: report.biasParity, must: '1.00' },
        { label: 'Clarification recall', value: report.clarificationRecall, must: '1.00' },
        { label: 'Citation accuracy', value: report.citationAccuracy, must: '≥ 0.99' },
        { label: 'Retrieval accuracy', value: report.retrievalAccuracy, must: '≥ 0.90' },
      ]
    : []

  return (
    <div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Intent classifier" value={intent.metrics.macroF1.toFixed(2)} unit="macro-F1" hint={`${intent.metrics.heldOut} held out, never trained on`} />
        <Stat label="Risk classifier" value={risk.metrics.macroF1.toFixed(2)} unit="macro-F1" hint="Advisory only — rules decide risk" />
        <Stat label="Cited documents" value={String(EVIDENCE_CORPUS.length)} unit="in the corpus" hint="NHS · CDC · WHO · MedlinePlus · NIH" />
        <Stat label="Claims invented" value="0.00" unit="by construction" hint="Every sentence is verbatim from a source" />
      </dl>

      <div className="mt-5 rounded-3xl border border-border bg-surface/85 p-5 shadow-soft backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-sans text-lg font-medium text-text">
              Run the evaluation suite, here, now
            </h3>
            <p className="mt-1 max-w-prose text-sm text-text-muted">
              Forty adversarial cases through the real pipeline — emergencies, ambiguity,
              hallucination bait, prompt injection, and the same question wrapped in different
              demographic framings.
            </p>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={running}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill bg-primary px-5',
              'text-sm font-medium text-primary-fg shadow-soft',
              'transition-colors duration-250 ease-calm hover:bg-primary-hover',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              'focus-visible:outline-ring disabled:opacity-55',
            )}
          >
            <Play aria-hidden="true" className="h-4 w-4" />
            {running ? 'Running…' : report ? 'Run it again' : 'Run it'}
          </button>
        </div>

        <div aria-live="polite" className="mt-4">
          {report ? (
            <>
              <ul className="grid gap-2 sm:grid-cols-2">
                {gates.map((gate, index) => {
                  const passing = gate.invert
                    ? gate.value === 0
                    : gate.value >= (gate.must.includes('0.90') ? 0.9 : gate.must.includes('0.99') ? 0.99 : 1)
                  return (
                    <motion.li
                      key={gate.label}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.04 }}
                      className="flex items-baseline justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-2.5"
                    >
                      <span className="text-sm text-text-muted">{gate.label}</span>
                      <span className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            'font-display text-lg tabular-nums',
                            passing ? 'text-primary' : 'text-accent-hover',
                          )}
                        >
                          {gate.value.toFixed(2)}
                        </span>
                        <span className="text-2xs uppercase tracking-[0.08em] text-text-subtle">
                          {gate.must}
                        </span>
                      </span>
                    </motion.li>
                  )
                })}
              </ul>
              <p className="mt-3 text-sm text-text-subtle">
                {report.outcomes.length} cases · median {report.medianLatencyMs.toFixed(1)} ms per
                question · all of it on this device, with nothing downloaded.
              </p>
            </>
          ) : (
            <p className="text-sm text-text-subtle">
              Nothing is precomputed — the numbers appear because the suite ran.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string
  value: string
  unit: string
  hint: string
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface/85 p-5 shadow-soft backdrop-blur">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
        {label}
      </dt>
      <dd className="mt-2">
        <span className="font-display text-display-xs text-primary">{value}</span>{' '}
        <span className="text-sm text-text-muted">{unit}</span>
        <span className="mt-1 block text-sm text-text-subtle">{hint}</span>
      </dd>
    </div>
  )
}

export default MeasuredNumbers
