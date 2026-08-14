import { Sparkles } from 'lucide-react'
import { evidenceSource } from '../../lib/concussion/evidence'
import { NEUROSCIENCE_NOTES } from '../../lib/concussion/neuroscience'
import { Card } from '../ui/Card'

/**
 * The mechanism behind the rules.
 *
 * See `lib/concussion/neuroscience.ts` for why this section is treatment
 * rather than trivia. The rendering choice that matters here is the `design`
 * line: each card ends by pointing at the specific behaviour in this app that
 * the mechanism produced, so the section reads as "here is why the app just
 * told you to wait" rather than as a detached science box.
 */
export function NeuroscienceNotes() {
  return (
    <section aria-labelledby="neuroscience-heading" className="mt-12">
      <h2
        id="neuroscience-heading"
        className="flex items-center gap-2 font-display text-2xl text-text"
      >
        <Sparkles aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
        What is actually happening in your brain
      </h2>

      <p className="mt-2 max-w-prose text-text-muted">
        Worth reading once, because it is not just background: in a controlled trial, simply
        understanding what concussion symptoms are and why they happen reduced how long they
        lasted. Every rule this page enforces has a mechanism behind it, and these are the
        mechanisms.
      </p>

      <div className="mt-5 space-y-4">
        {NEUROSCIENCE_NOTES.map((note) => {
          const source = evidenceSource(note.sourceId)
          return (
            <Card key={note.id} padding="md" as="article">
              <h3 className="font-sans text-lg font-medium text-text">{note.title}</h3>
              <p className="mt-2 max-w-prose text-text-muted">{note.body}</p>
              <p className="mt-3 max-w-prose text-sm text-text">
                <span className="font-semibold">In this app:</span>{' '}
                <span className="text-text-muted">{note.design}</span>
              </p>
              <p className="mt-3 text-sm text-text-subtle">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                >
                  {source.name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

export default NeuroscienceNotes
