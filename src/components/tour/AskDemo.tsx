import { BadgeCheck, HelpCircle, Siren } from 'lucide-react'
import { useState } from 'react'
import { runGuidePipeline, type GuideAnswer } from '../../lib/guide/pipeline'
import { cn } from '../../lib/cn'
import { Card } from '../ui/Card'

/**
 * Four questions that show four different behaviours.
 *
 * The last one is the important one. A tour that only ever demonstrates the
 * happy path is advertising, and the claim being made here is specifically
 * that Ask declines rather than guesses — so the tour has to include a
 * question it declines, chosen because it is exactly the kind of question
 * someone would reasonably expect a health app to answer.
 */
const EXAMPLES: readonly { text: string; note: string }[] = [
  { text: 'why can I not sleep at night', note: 'A straightforward one' },
  { text: 'why do I keep getting headaches', note: 'A symptom' },
  { text: 'how long does a concussion take to recover from', note: 'Recovery' },
  { text: 'should I stop taking my antidepressants', note: 'Watch it decline' },
]

/** The pipeline's stage names, in the language of the person reading them. */
const STAGE_LABELS: Record<string, string> = {
  risk: 'Checked for signs of an emergency',
  intent: 'Worked out what kind of question this is',
  retrieve: 'Searched the evidence base',
  verify: 'Verified the answer against its sources',
  'verify (strict)': 'Re-verified after tightening',
  route: 'Chose the response',
}

/**
 * Ask, running for real, in the tour.
 *
 * `runGuidePipeline` is synchronous and depends on no download — the lexical
 * retrieval path is the one the whole evaluation suite runs in, and the safety
 * rails are identical on both paths. So this is not a reduced demonstration
 * version: it is the same function the Ask screen calls, over the same corpus,
 * returning the same object. The only difference is that this renders a
 * shorter view of it.
 */
export function AskDemo() {
  const [answer, setAnswer] = useState<GuideAnswer | null>(null)

  return (
    <Card tone="sunken" padding="md">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
        Ask one of these
      </p>

      <ul className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => {
          const active = answer?.query === example.text
          return (
            <li key={example.text}>
              <button
                type="button"
                onClick={() => setAnswer(runGuidePipeline({ query: example.text }))}
                aria-pressed={active}
                className={cn(
                  'min-h-9 rounded-pill border px-3.5 py-1.5 text-left text-sm shadow-soft',
                  'transition-colors duration-250 ease-calm',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                  'focus-visible:outline-ring',
                  active
                    ? 'border-primary bg-primary-soft text-primary-hover'
                    : 'border-border bg-surface text-text hover:border-border-strong hover:bg-surface-muted',
                )}
              >
                <span className="font-medium">“{example.text}”</span>
                {/*
                  The muted note is only muted against the plain surface. On
                  the selected chip's tint it has to take the chip's own
                  colour, or it drops under the contrast floor.
                */}
                <span className={cn('ml-2 text-xs', active ? 'text-primary-hover' : 'text-text-subtle')}>
                  {example.note}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div aria-live="polite" className="mt-6">
        {answer ? (
          <AnswerSummary answer={answer} />
        ) : (
          <p className="text-sm text-text-muted">
            Nothing is sent anywhere when you press one — the corpus and the classifier are already
            here, in the page.
          </p>
        )}
      </div>
    </Card>
  )
}

function AnswerSummary({ answer }: { answer: GuideAnswer }) {
  if (answer.kind === 'crisis' || answer.kind === 'escalate') {
    return (
      <div className="rounded-2xl border border-accent/50 bg-accent-soft/45 p-5">
        <h3 className="flex items-center gap-2.5 font-display text-xl text-text">
          <Siren aria-hidden="true" className="h-5 w-5 shrink-0 text-accent-hover" />
          It stopped and routed to help
        </h3>
        <p className="mt-2 max-w-prose text-text-muted">
          This question matched a pattern health services treat as urgent, so the pipeline stopped
          before retrieval. Mindful does not offer education over the top of that.
        </p>
        <Working answer={answer} />
      </div>
    )
  }

  if (answer.kind === 'clarify') {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
        <h3 className="flex items-center gap-2.5 font-display text-xl text-text">
          <HelpCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
          {answer.intent.intent === 'out-of-scope' || answer.intent.intent === 'medication'
            ? 'It declined, on purpose'
            : 'It asked for more first'}
        </h3>
        <p className="mt-2 max-w-prose text-text-muted">
          {answer.intent.intent === 'out-of-scope' || answer.intent.intent === 'medication'
            ? 'Some questions have a right answer that an app is not the one to give. Rather than produce something plausible, it says so and offers what would actually help:'
            : 'Answering this safely needs more than the question says so far, so it asks rather than guesses:'}
        </p>
        <ul className="mt-3 space-y-2 text-text-muted">
          {answer.clarifyingQuestions.map((question) => (
            <li key={question} className="flex gap-2.5">
              <span aria-hidden="true" className="select-none text-text-subtle">
                ·
              </span>
              <span className="max-w-prose">{question}</span>
            </li>
          ))}
        </ul>
        <Working answer={answer} />
      </div>
    )
  }

  const response = answer.response
  if (!response) return null

  const cited = response.evidenceSays[0]
  const doc = cited ? response.sources.find((source) => source.id === cited.docId) : undefined

  // A medication or out-of-scope question comes back through the same shape as
  // any other answer — the answer is simply that it will not answer. Saying so
  // is the whole point of putting one in the tour, and without a label it
  // reads as a thin reply rather than a deliberate boundary.
  const declined =
    answer.intent.intent === 'medication' || answer.intent.intent === 'out-of-scope'

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      {declined ? (
        <p className="mb-3 inline-flex items-center gap-2 rounded-pill bg-surface-muted px-3 py-1 text-xs font-medium text-text-muted">
          <HelpCircle aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
          It declined, on purpose — and still cited why
        </p>
      ) : null}

      <div className="max-w-prose space-y-2">
        {response.directAnswer.map((claim) => (
          <p
            key={claim.text}
            className={
              claim.kind === 'evidence' ? 'font-display text-xl text-text' : 'text-text-muted'
            }
          >
            {claim.text}
          </p>
        ))}
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm text-text-muted">
        <BadgeCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
        <span>
          confidence {answer.confidence.toFixed(2)} · {response.sources.length}{' '}
          {response.sources.length === 1 ? 'source' : 'sources'} · every claim traced to one of them
        </span>
      </p>

      {cited && doc ? (
        <div className="mt-4 rounded-2xl bg-surface-muted p-4">
          <p className="max-w-prose text-sm text-text-muted">{cited.text}</p>
          <p className="mt-2 text-sm text-text-subtle">
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
            >
              {doc.org} — {doc.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>{' '}
            · checked {doc.retrieved}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-sm text-text-subtle">
        The full answer on the Ask screen also carries what is uncertain, what to do next, and when
        to seek professional help.
      </p>

      <Working answer={answer} />
    </div>
  )
}

/** The pipeline's own trace. There is no hidden reasoning to withhold. */
function Working({ answer }: { answer: GuideAnswer }) {
  return (
    <details className="group mt-5">
      <summary
        className={cn(
          'cursor-pointer list-none rounded-lg text-sm font-medium text-primary',
          'underline decoration-primary/40 underline-offset-4 transition-colors',
          'hover:decoration-primary',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-ring',
        )}
      >
        How it got there
      </summary>

      <ol className="mt-3 space-y-1.5 text-sm text-text-muted">
        {answer.trace.map((stage, index) => (
          <li key={`${stage.name}-${index}`} className="flex flex-wrap gap-x-2">
            <span className="font-medium text-text">{STAGE_LABELS[stage.name] ?? stage.name}</span>
            <span className="text-text-subtle">{stage.note}</span>
          </li>
        ))}
      </ol>

      {answer.verdict ? (
        <p className="mt-3 max-w-prose text-sm text-text-subtle">
          Verifier: evidence support {answer.verdict.evidenceSupport.toFixed(2)} · invented claims{' '}
          {answer.verdict.hallucinationRisk.toFixed(2)} · citation accuracy{' '}
          {answer.verdict.citationAccuracy.toFixed(2)} — checked independently, before any of this
          reached the screen.
        </p>
      ) : null}
    </details>
  )
}

export default AskDemo
