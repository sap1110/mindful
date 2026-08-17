import { Download, Trash2 } from 'lucide-react'
import { useMindfulData } from '../../hooks/useMindfulData'
import { exportFilename } from '../../lib/storage'
import { Card } from '../ui/Card'

/**
 * What is actually on this device, counted now.
 *
 * A settings screen that says "export your data" is describing a capability.
 * This says how many records there are and what the file would be called,
 * which is the same claim with the vagueness taken out — and on a device that
 * has just arrived it honestly reads zero, which is its own answer to "what
 * has this app collected about me".
 */
export function DataDemo() {
  const data = useMindfulData()

  const rows = [
    { label: 'Check-ins', count: data.moods.length },
    { label: 'Journal entries', count: data.journal.length },
    { label: 'Breathing sessions', count: data.breathing.length },
    { label: 'Self-checks', count: data.screeners.length },
    { label: 'Symptom checks', count: data.concussion.length },
  ]

  const total = rows.reduce((sum, row) => sum + row.count, 0)

  return (
    <Card tone="sunken" padding="md">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
        On this device, right now
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl bg-surface p-3 shadow-soft">
            <dt className="text-xs text-text-muted">{row.label}</dt>
            <dd className="mt-0.5 font-display text-2xl text-text">{row.count}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-5 space-y-3 text-sm text-text-muted">
        <li className="flex gap-2.5">
          <Download aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="max-w-prose">
            {total === 0
              ? 'There is nothing here yet, so an export would be an empty file — but it would still be '
              : `All ${total} of those download as one file, `}
            <code className="rounded-xs bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-text">
              {exportFilename()}
            </code>
            . Built in the page, not fetched from anywhere.
          </span>
        </li>
        <li className="flex gap-2.5">
          <Trash2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="max-w-prose">
            Erasing asks you to confirm and then clears every key this app owns — including your
            profile, and including the fact that you have seen this tour.
          </span>
        </li>
      </ul>
    </Card>
  )
}

export default DataDemo
