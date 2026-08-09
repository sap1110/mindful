import { Info, LifeBuoy } from 'lucide-react'
import { cn } from '../lib/cn'

export interface DisclaimerProps {
  /**
   * `note` — a single quiet line, for screens with little health-adjacent copy.
   * `panel` — the full statement plus crisis routing, for screens that give or
   *           imply guidance.
   */
  variant?: 'note' | 'panel'
  className?: string
}

const CRISIS_HELP_URL = 'https://findahelpline.com'

/**
 * The mandatory "not medical advice" disclaimer.
 *
 * Every route in Mindful renders one of these. It is a `<section>` with an
 * accessible name rather than fine print, so it appears in a screen reader's
 * landmark list instead of being skimmed past.
 */
export function Disclaimer({ variant = 'note', className }: DisclaimerProps) {
  if (variant === 'note') {
    return (
      <section
        aria-label="Important health notice"
        className={cn('flex items-start gap-2.5 text-sm text-text-muted', className)}
      >
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
        <p className="max-w-prose">
          <strong className="font-medium text-text">Mindful is not medical advice.</strong> It is a
          self-care companion, not a diagnosis, treatment, or a substitute for a professional. If
          you are in crisis,{' '}
          <a
            href={CRISIS_HELP_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
          >
            find a helpline near you
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </section>
    )
  }

  return (
    <section
      aria-label="Important health notice"
      className={cn(
        'rounded-2xl border border-border bg-surface-muted/70 p-5 text-sm text-text-muted',
        className,
      )}
    >
      <h2 className="mb-1.5 flex items-center gap-2 font-sans text-sm font-semibold text-text">
        <LifeBuoy aria-hidden="true" className="h-4 w-4 text-accent" />
        Not medical advice
      </h2>
      <p className="max-w-prose">
        Mindful offers reflective self-care prompts. It does not diagnose, treat, or replace care
        from a qualified professional, and nothing here should delay you seeking one.
      </p>
      <p className="mt-2 max-w-prose">
        If you are in crisis or thinking about harming yourself, contact your local emergency
        number now, or{' '}
        <a
          href={CRISIS_HELP_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
        >
          find a crisis helpline in your country
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        .
      </p>
    </section>
  )
}

export default Disclaimer
