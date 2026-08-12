import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface PromptCardProps {
  prompt: string
  onDismiss: () => void
  /** Drop the prompt into the composer rather than making the person retype it. */
  onUse?: () => void
  className?: string
}

/**
 * The day's optional prompt.
 *
 * It sits above the composer as an offer, not an instruction — you can write
 * something else, or send it away entirely. The dismiss control is a real
 * button with a text label for assistive tech, because a bare × is not a name.
 */
export function PromptCard({ prompt, onDismiss, onUse, className }: PromptCardProps) {
  return (
    <section
      aria-labelledby="journal-prompt-label"
      className={cn(
        'relative rounded-2xl border border-clay-200 bg-accent-soft/70 p-4 pr-12 sm:p-5 sm:pr-14',
        className,
      )}
    >
      <h2
        id="journal-prompt-label"
        className="font-sans text-2xs font-semibold uppercase tracking-[0.12em] text-accent-hover"
      >
        Today&rsquo;s prompt · optional
      </h2>

      <p className="mt-1.5 text-lg text-text">{prompt}</p>

      {onUse ? (
        <button
          type="button"
          onClick={onUse}
          className="mt-2.5 rounded-xs text-sm font-medium text-accent-hover underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent-hover"
        >
          Start with this prompt
        </button>
      ) : null}

      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-pill text-accent-hover transition-colors hover:bg-clay-100"
      >
        <X aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">Dismiss today&rsquo;s prompt</span>
      </button>
    </section>
  )
}

export default PromptCard
