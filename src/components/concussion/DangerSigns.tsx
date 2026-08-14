import { Siren } from 'lucide-react'
import {
  DANGER_SIGNS,
  EMERGENCY_ACTION,
  INFANT_DANGER_SIGNS,
  SAME_DAY_RULE,
} from '../../lib/concussion/redflags'
import { evidenceSource } from '../../lib/concussion/evidence'
import { cn } from '../../lib/cn'

export interface DangerSignsProps {
  className?: string
}

/**
 * The danger signs, at the top of the screen, on every visit.
 *
 * Not collapsed, not conditional, not the reward for finishing a
 * questionnaire. This is the only part of the recovery feature where getting
 * it wrong is measured in hours rather than in weeks, and someone scrolling
 * past it having read nothing is a better outcome than someone who never had
 * the chance to.
 *
 * There is no checklist and no score. Ticking boxes would imply that a total
 * matters here — it does not. One sign is the whole threshold, and the
 * response to it is the same every time.
 */
export function DangerSigns({ className }: DangerSignsProps) {
  const cdc = evidenceSource('cdc')

  return (
    <section
      aria-labelledby="danger-signs-heading"
      className={cn(
        'rounded-3xl border-2 border-accent/60 bg-accent-soft/50 p-6 sm:p-7',
        className,
      )}
    >
      <h2
        id="danger-signs-heading"
        className="flex items-center gap-2.5 font-display text-2xl text-text"
      >
        <Siren aria-hidden="true" className="h-5 w-5 shrink-0 text-accent-hover" />
        Get emergency care if any of these happen
      </h2>

      <p className="mt-3 max-w-prose text-text">
        After a knock to the head, these can mean bleeding or swelling in the brain. They can start
        hours or days later, so this list is worth knowing rather than reading once.
      </p>

      <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {DANGER_SIGNS.map((sign) => (
          <li key={sign.id} className="flex gap-2.5 text-text">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{sign.text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 max-w-prose text-sm text-text-muted">
        In a baby or toddler, also:{' '}
        {INFANT_DANGER_SIGNS.map((sign) => sign.toLowerCase()).join('; ')}.
      </p>

      <p className="mt-5 rounded-2xl bg-surface/80 p-4 font-medium text-text">{EMERGENCY_ACTION}</p>

      <p className="mt-4 max-w-prose text-sm text-text-muted">{SAME_DAY_RULE}</p>

      <p className="mt-3 text-sm text-text-subtle">
        This list is{' '}
        <a
          href={cdc.url}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
        >
          {cdc.name}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        ’s, unchanged.
      </p>
    </section>
  )
}

export default DangerSigns
