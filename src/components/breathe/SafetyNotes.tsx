import { ShieldCheck } from 'lucide-react'
import type { BreathingPattern } from '../../lib/breathing'
import {
  NOT_FOR_EVERY_MOMENT,
  UNIVERSAL_CAUTIONS,
  WHO_SHOULD_ASK_FIRST,
  WHO_SHOULD_ASK_FIRST_SOURCE,
  guidanceFor,
  sourceFor,
} from '../../lib/breathingSafety'
import { cn } from '../../lib/cn'

export interface SafetyNotesProps {
  pattern: BreathingPattern
  className?: string
}

/**
 * The cautions that apply to the rhythm on screen, before it starts.
 *
 * Always visible, never collapsed. A safety note behind a "show more" is a
 * disclaimer written for the people who build the app rather than the people
 * who use it, and this one is short enough not to need hiding: three lines that
 * cover over-breathing and where not to do this, plus whatever the chosen
 * rhythm adds on its own.
 *
 * The provenance line at the bottom is doing quiet work too. It is the
 * difference between an app that implies a health service endorsed its
 * breathing exercise and one that tells you exactly which rhythm the NHS
 * actually describes and which are simply widely taught.
 */
export function SafetyNotes({ pattern, className }: SafetyNotesProps) {
  const guidance = guidanceFor(pattern.id)
  const source = sourceFor(guidance.sourceId)
  const askFirstSource = sourceFor(WHO_SHOULD_ASK_FIRST_SOURCE)
  const cautions = [...UNIVERSAL_CAUTIONS, ...guidance.cautions]

  return (
    <section
      aria-labelledby="breathing-safety-heading"
      className={cn(
        'rounded-2xl border border-border bg-surface-muted/70 p-5 text-sm text-text-muted',
        className,
      )}
    >
      <h2
        id="breathing-safety-heading"
        className="mb-2.5 flex items-center gap-2 font-sans text-sm font-semibold text-text"
      >
        <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
        Before you start
      </h2>

      <ul className="max-w-prose space-y-1.5">
        {cautions.map((caution) => (
          <li key={caution} className="flex gap-2.5">
            <span aria-hidden="true" className="select-none text-text-subtle">
              ·
            </span>
            <span>{caution}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 max-w-prose">
        {WHO_SHOULD_ASK_FIRST}
        {askFirstSource ? (
          <>
            {' '}
            <a
              href={askFirstSource.url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
            >
              {askFirstSource.name}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </>
        ) : null}
      </p>

      <p className="mt-2 max-w-prose">{NOT_FOR_EVERY_MOMENT}</p>

      <p className="mt-3 max-w-prose text-text-subtle">
        <span className="font-medium text-text-muted">{pattern.name} · {pattern.rhythm}.</span>{' '}
        {guidance.provenance}
        {source ? (
          <>
            {' '}
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
            >
              {source.name}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </>
        ) : null}
      </p>
    </section>
  )
}

export default SafetyNotes
