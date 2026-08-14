import { motion } from 'framer-motion'
import {
  BadgeCheck,
  Download,
  HelpCircle,
  Loader2,
  MessageCircleQuestion,
  Siren,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppNav } from '../components/AppNav'
import { CrisisResources } from '../components/crisis/CrisisResources'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextArea } from '../components/ui/TextArea'
import { useGuide } from '../hooks/useGuide'
import { ACUTE_BODY, ACUTE_HEADING } from '../lib/echo/safety'
import { MODEL_DOWNLOAD_MB } from '../lib/echo/embeddings'
import { EMERGENCY_ACTION } from '../lib/concussion/redflags'
import type { GuideAnswer } from '../lib/guide/pipeline'
import { staggerChild, staggerParent } from '../lib/motion'

const PLACEHOLDER = 'I keep getting headaches after long days — what could help?'

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
 * Ask — evidence-first answers to health questions.
 *
 * The PRD behind this screen calls for an AI pipeline where the model is one
 * component among guards: risk classification before anything else, retrieval
 * from a curated evidence base, composition that cannot invent facts, and an
 * independent verifier between the answer and the screen. This page renders
 * that pipeline's output in the safe-response format — answer, evidence,
 * uncertainty, next steps, when to seek help, sources — and shows the working
 * underneath, because a health answer someone cannot interrogate is a health
 * answer they have to take on faith.
 *
 * Everything runs on this device. The question is never sent anywhere, there
 * is no generative model to leak it into, and the optional 30MB embedding
 * download upgrades retrieval from word-matching to meaning-matching — the
 * same model Echo uses, shared.
 */
export function Ask() {
  const { status, enable, ask, answer, thinking, clear } = useGuide()
  const [draft, setDraft] = useState('')
  const resultsRef = useRef<HTMLDivElement>(null)

  async function handleAsk() {
    if (draft.trim().length === 0) return
    await ask(draft)
    window.requestAnimationFrame(() => resultsRef.current?.focus())
  }

  return (
    <PageShell nav={<AppNav />} disclaimer="panel">
      <motion.div variants={staggerParent} initial="hidden" animate="visible">
        <motion.p
          variants={staggerChild}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
        >
          Ask
        </motion.p>

        <motion.h1
          variants={staggerChild}
          className="mt-3 max-w-prose text-display-xs text-text sm:text-display-sm"
        >
          What does the evidence say?
        </motion.h1>

        <motion.p variants={staggerChild} className="mt-4 max-w-prose text-lg text-text-muted">
          Ask a health question and get what published guidance actually says — every claim traced
          to a named source, checked before it reaches you, with the uncertainty stated. It answers
          from evidence or it says so; it never guesses.
        </motion.p>

        <motion.div variants={staggerChild} className="mt-8">
          <TextArea
            label="Your question"
            hint="Read on your device and never sent anywhere."
            placeholder={PLACEHOLDER}
            value={draft}
            rows={3}
            onChange={(event) => setDraft(event.target.value)}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={handleAsk}
              disabled={thinking || draft.trim().length === 0}
              iconLeft={
                thinking ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <MessageCircleQuestion className="h-4 w-4" />
                )
              }
            >
              {thinking ? 'Checking…' : 'Ask'}
            </Button>

            {answer ? (
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  clear()
                  setDraft('')
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>

          {status.state === 'idle' ? (
            <p className="mt-3 max-w-prose text-sm text-text-subtle">
              Searching by the words you use.{' '}
              <button
                type="button"
                onClick={() => void enable()}
                className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
              >
                <Download aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                Add matching by meaning (~{MODEL_DOWNLOAD_MB}MB, once)
              </button>{' '}
              — weights come down, nothing goes up. Shared with Echo.
            </p>
          ) : status.state === 'loading' ? (
            <p role="status" aria-live="polite" className="mt-3 text-sm text-text-subtle">
              Downloading, once — {Math.round(status.progress * 100)}%.
            </p>
          ) : null}
        </motion.div>

        {/* ------------------------------------------------------------ answer */}

        <div ref={resultsRef} tabIndex={-1} className="scroll-mt-8 focus:outline-none" aria-live="polite">
          {answer ? <AnswerView answer={answer} /> : null}
        </div>
      </motion.div>
    </PageShell>
  )
}

function AnswerView({ answer }: { answer: GuideAnswer }) {
  if (answer.kind === 'crisis') {
    return (
      <div className="mt-10">
        <Card tone="raised" padding="lg" className="border-accent/50 bg-accent-soft/45">
          <h2 className="font-display text-2xl text-text">{ACUTE_HEADING}</h2>
          {ACUTE_BODY.map((line) => (
            <p key={line} className="mt-3 max-w-prose text-text-muted">
              {line}
            </p>
          ))}
        </Card>
        <CrisisResources className="mt-6" tone="urgent" heading="Please talk to someone" />
      </div>
    )
  }

  if (answer.kind === 'escalate') {
    return (
      <Card tone="raised" padding="lg" className="mt-10 border-accent/60 bg-accent-soft/50">
        <h2 className="flex items-center gap-2.5 font-display text-2xl text-text">
          <Siren aria-hidden="true" className="h-5 w-5 shrink-0 text-accent-hover" />
          This could be an emergency
        </h2>
        <p className="mt-3 max-w-prose text-text">
          What you describe matches a pattern that health services treat as urgent. Mindful will
          not offer education over the top of that.
        </p>
        <p className="mt-4 rounded-2xl bg-surface/80 p-4 font-medium text-text">{EMERGENCY_ACTION}</p>
        <p className="mt-3 max-w-prose text-sm text-text-muted">
          If this turns out to be nothing, that is a good outcome, not a wasted call — urgency
          checks are exactly what emergency services are for.
        </p>
      </Card>
    )
  }

  if (answer.kind === 'clarify') {
    return (
      <Card tone="raised" padding="lg" className="mt-10">
        <h2 className="flex items-center gap-2.5 font-display text-2xl text-text">
          <HelpCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
          {answer.intent.intent === 'out-of-scope'
            ? 'That needs a professional, not an app'
            : 'A little more detail first'}
        </h2>
        <p className="mt-3 max-w-prose text-text-muted">
          {answer.intent.intent === 'out-of-scope'
            ? 'Rather than answer badly, here is what would actually help:'
            : 'Answering that safely needs more than it says so far. A guess dressed up as guidance would be worse than a question back:'}
        </p>
        <ul className="mt-4 space-y-2 text-text-muted">
          {answer.clarifyingQuestions.map((question) => (
            <li key={question} className="flex gap-2.5">
              <span aria-hidden="true" className="select-none text-text-subtle">
                ·
              </span>
              <span className="max-w-prose">{question}</span>
            </li>
          ))}
        </ul>
        <HowThisWorked answer={answer} />
      </Card>
    )
  }

  const response = answer.response
  if (!response) return null

  const confidenceWord =
    answer.confidence >= 0.7 ? 'Strong' : answer.confidence >= 0.4 ? 'Partial' : 'Weak'

  return (
    <div className="mt-10">
      {answer.kind === 'fallback' ? (
        <p className="mb-4 max-w-prose rounded-2xl bg-surface-muted p-4 text-sm text-text-muted">
          Verification would not pass a fuller answer, so this is the minimal one: no factual
          claims, just where to take the question.
        </p>
      ) : null}

      <h2 className="sr-only">Answer</h2>

      {/* Direct answer */}
      <div className="max-w-prose space-y-3">
        {response.directAnswer.map((claim) => (
          <p
            key={claim.text}
            className={claim.kind === 'evidence' ? 'font-display text-xl text-text' : 'text-text-muted'}
          >
            {claim.text}
          </p>
        ))}
      </div>

      {/* Confidence, stated in words with the number beside it. */}
      <p className="mt-4 flex items-center gap-2 text-sm text-text-muted">
        <BadgeCheck aria-hidden="true" className="h-4 w-4 text-primary" />
        <span>
          <span className="font-medium text-text">{confidenceWord} evidence match</span> ·
          confidence {answer.confidence.toFixed(2)} · every claim below is traced to its source
        </span>
      </p>

      {/* What the evidence says */}
      {response.evidenceSays.length > 0 ? (
        <section aria-labelledby="evidence-heading" className="mt-8">
          <h3
            id="evidence-heading"
            className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
          >
            What the evidence says
          </h3>
          <div className="mt-3 space-y-4">
            {response.evidenceSays.map((claim) => {
              const doc = response.sources.find((source) => source.id === claim.docId)
              return (
                <Card key={claim.text} padding="md" as="article">
                  <p className="max-w-prose text-text-muted">{claim.text}</p>
                  {doc ? (
                    <p className="mt-3 text-sm text-text-subtle">
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
                  ) : null}
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* What is uncertain */}
      <section aria-labelledby="uncertain-heading" className="mt-8">
        <h3
          id="uncertain-heading"
          className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
        >
          What is uncertain
        </h3>
        <ul className="mt-3 space-y-2 text-text-muted">
          {response.uncertainties.map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden="true" className="select-none text-text-subtle">
                ·
              </span>
              <span className="max-w-prose">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What to do next */}
      {response.nextSteps.length > 0 ? (
        <section aria-labelledby="next-heading" className="mt-8">
          <h3
            id="next-heading"
            className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
          >
            What to do next
          </h3>
          <ul className="mt-3 space-y-2 text-text-muted">
            {response.nextSteps.map((step) => (
              <li key={step.text} className="flex gap-2.5">
                <span aria-hidden="true" className="select-none text-text-subtle">
                  ·
                </span>
                <span className="max-w-prose">
                  {step.text}
                  {step.inApp ? (
                    <>
                      {' '}
                      <Link
                        to={step.inApp.to}
                        className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                      >
                        {step.inApp.label}
                      </Link>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* When to seek help */}
      <section aria-labelledby="seek-heading" className="mt-8">
        <h3
          id="seek-heading"
          className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
        >
          When to seek professional help
        </h3>
        <ul className="mt-3 space-y-2 text-text">
          {response.seekHelp.map((line) => (
            <li key={line} className="flex gap-2.5">
              <span aria-hidden="true" className="select-none text-text-subtle">
                ·
              </span>
              <span className="max-w-prose">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <HowThisWorked answer={answer} />
    </div>
  )
}

/** PRD §16: visible reasoning, no chain-of-thought — there is none to expose. */
function HowThisWorked({ answer }: { answer: GuideAnswer }) {
  return (
    <section aria-labelledby="how-heading" className="mt-10">
      <h3
        id="how-heading"
        className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
      >
        How this answer was put together
      </h3>
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
          {answer.verdict.citationAccuracy.toFixed(2)} — checked independently before anything
          reached this screen.
        </p>
      ) : null}
    </section>
  )
}

export default Ask
