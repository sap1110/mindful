import { motion } from 'framer-motion'
import { ArrowRight, ClipboardCheck, Clock } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { AppNav } from '../components/AppNav'
import { CrisisResources } from '../components/crisis/CrisisResources'
import { PageShell } from '../components/PageShell'
import { ResultPanel } from '../components/screener/ResultPanel'
import { ScreenerHistory } from '../components/screener/ScreenerHistory'
import { ScreenerItem } from '../components/screener/ScreenerItem'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useMindfulData, useSampleIds } from '../hooks/useMindfulData'
import { todayISO } from '../lib/date'
import { staggerChild, staggerParent } from '../lib/motion'
import {
  SCREENERS,
  daysUntilRetake,
  getScreener,
  isComplete,
  scoreScreener,
  unansweredQuestions,
  type Screener,
  type ScreenerAnswer,
  type ScreenerId,
  type ScreenerOutcome,
} from '../lib/screener'
import { saveScreenerResult, type ScreenerResult } from '../lib/storage'

type Stage = 'choose' | 'taking' | 'result'

/** The result being shown, plus the score it is being compared against. */
interface CompletedRun {
  screenerId: ScreenerId
  outcome: ScreenerOutcome
  previousScore: number | null
}

/**
 * The validated self-checks.
 *
 * Three stages on one route rather than three routes: the flow is short, and
 * keeping it in one place means the back button leaves the section entirely
 * instead of stepping backwards into a half-finished questionnaire and
 * resurrecting answers someone thought they had left behind.
 *
 * Nothing is written to storage until a run is finished and scored. A form
 * abandoned halfway leaves no trace — which is the right default for a page
 * where the questions are this personal, and the opposite of the autosaved
 * journal draft next door.
 */
export function SelfCheck() {
  const { screeners } = useMindfulData()
  const sampleIds = useSampleIds()
  const today = todayISO()

  const [stage, setStage] = useState<Stage>('choose')
  const [activeId, setActiveId] = useState<ScreenerId>('phq9')
  const [answers, setAnswers] = useState<Record<string, ScreenerAnswer>>({})
  const [showMissing, setShowMissing] = useState(false)
  const [completed, setCompleted] = useState<CompletedRun | null>(null)

  const screener = getScreener(activeId)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Focus the incoming heading on every stage change. Without this the focus
  // ring stays on a button that no longer exists and a screen reader is left
  // at the top of a page it was never told had changed.
  useEffect(() => {
    headingRef.current?.focus()
  }, [stage])

  function beginRun(id: ScreenerId) {
    setActiveId(id)
    setAnswers({})
    setShowMissing(false)
    setCompleted(null)
    setStage('taking')
  }

  function answerQuestion(questionId: string, value: ScreenerAnswer) {
    setAnswers((current) => ({ ...current, [questionId]: value }))
  }

  function handleSubmit() {
    if (!isComplete(screener, answers)) {
      setShowMissing(true)
      // Send focus to the first gap rather than to an error at the top, so the
      // fix is one keystroke away instead of a scroll away.
      const [first] = unansweredQuestions(screener, answers)
      if (first) {
        document.getElementById(`${first.id}-anchor`)?.scrollIntoView({ block: 'center' })
        document.querySelector<HTMLInputElement>(`input[name="${first.id}"]`)?.focus()
      }
      return
    }

    const outcome = scoreScreener(screener, answers)
    const previous = screeners.find((result) => result.screenerId === activeId)

    saveScreenerResult({
      screenerId: activeId,
      date: today,
      score: outcome.score,
      bandId: outcome.band.id,
      answers,
      riskFlagged: outcome.riskFlagged,
    })

    setCompleted({
      screenerId: activeId,
      outcome,
      previousScore: previous ? previous.score : null,
    })
    setStage('result')
  }

  const missing = showMissing ? new Set(unansweredQuestions(screener, answers).map((q) => q.id)) : null
  const answeredCount = screener.questions.filter((q) => answers[q.id] !== undefined).length

  return (
    <PageShell nav={<AppNav />} disclaimer="panel">
      {stage === 'choose' ? (
        <ChooseScreener
          headingRef={headingRef}
          today={today}
          results={screeners}
          sampleIds={sampleIds}
          onBegin={beginRun}
        />
      ) : null}

      {stage === 'taking' ? (
        <motion.div variants={staggerParent} initial="hidden" animate="visible">
          <motion.p
            variants={staggerChild}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
          >
            {screener.name} · {screener.fullName}
          </motion.p>

          <motion.h1
            variants={staggerChild}
            ref={headingRef}
            tabIndex={-1}
            className="mt-3 max-w-prose text-display-xs text-text focus:outline-none sm:text-display-sm"
          >
            {screener.stem}
          </motion.h1>

          <motion.p variants={staggerChild} className="mt-4 max-w-prose text-lg text-text-muted">
            There are no right answers and nothing is saved until you finish. If a question does not
            quite fit, pick the closest thing and move on.
          </motion.p>

          <motion.p
            variants={staggerChild}
            aria-live="polite"
            className="mt-6 text-sm text-text-subtle"
          >
            {answeredCount} of {screener.questions.length} answered
          </motion.p>

          <motion.div variants={staggerChild} className="mt-4 space-y-3">
            {screener.questions.map((question, index) => (
              <div key={question.id} id={`${question.id}-anchor`}>
                <ScreenerItem
                  question={question}
                  options={screener.options}
                  position={index + 1}
                  total={screener.questions.length}
                  value={answers[question.id]}
                  onChange={(value) => answerQuestion(question.id, value)}
                  isMissing={missing?.has(question.id) ?? false}
                />
              </div>
            ))}
          </motion.div>

          {showMissing && missing && missing.size > 0 ? (
            <p role="alert" className="mt-5 text-sm font-medium text-accent-hover">
              {missing.size === 1
                ? 'One question is still to answer — the score only means something once they all are.'
                : `${missing.size} questions are still to answer — the score only means something once they all are.`}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={handleSubmit}>
              See what this comes to
            </Button>
            <Button variant="ghost" size="md" onClick={() => setStage('choose')}>
              Leave this for now
            </Button>
          </div>

          <p className="mt-4 max-w-prose text-sm text-text-subtle">
            Leaving discards your answers — nothing is written to this device until a check is
            finished.
          </p>

          <CrisisResources className="mt-12" />
        </motion.div>
      ) : null}

      {stage === 'result' && completed ? (
        <>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="sr-only focus:outline-none"
          >
            Your {getScreener(completed.screenerId).name} result
          </h1>
          <ResultPanel
            screener={getScreener(completed.screenerId)}
            outcome={completed.outcome}
            previousScore={completed.previousScore}
            onRetake={() => beginRun(completed.screenerId)}
          />
          <Button
            variant="ghost"
            size="md"
            className="mt-8"
            onClick={() => {
              setCompleted(null)
              setStage('choose')
            }}
          >
            Back to the self-checks
          </Button>
        </>
      ) : null}
    </PageShell>
  )
}

/* -------------------------------------------------------------- the chooser */

interface ChooseScreenerProps {
  headingRef: RefObject<HTMLHeadingElement>
  today: string
  results: readonly ScreenerResult[]
  sampleIds: readonly string[]
  onBegin: (id: ScreenerId) => void
}

function ChooseScreener({ headingRef, today, results, sampleIds, onBegin }: ChooseScreenerProps) {
  const lastTaken = useMemo(() => {
    const map = new Map<ScreenerId, string>()
    // `results` is newest first, so the first sighting of each id is the latest.
    for (const result of results) {
      if (!map.has(result.screenerId)) map.set(result.screenerId, result.date)
    }
    return map
  }, [results])

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible">
      <motion.p
        variants={staggerChild}
        className="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
      >
        Self-check
      </motion.p>

      <motion.h1
        variants={staggerChild}
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-display-xs text-text focus:outline-none sm:text-display-sm"
      >
        Where are things, really?
      </motion.h1>

      <motion.p variants={staggerChild} className="mt-4 max-w-prose text-lg text-text-muted">
        Two questionnaires used in clinics the world over. They take a couple of minutes, they stay
        on this device, and they are a way of putting words to a fortnight — not a test you can
        fail.
      </motion.p>

      <motion.div variants={staggerChild} className="mt-8 grid gap-4 sm:grid-cols-2">
        {SCREENERS.map((screener) => (
          <ScreenerCard
            key={screener.id}
            screener={screener}
            lastTakenISO={lastTaken.get(screener.id) ?? null}
            today={today}
            onBegin={() => onBegin(screener.id)}
          />
        ))}
      </motion.div>

      <motion.div variants={staggerChild}>
        <ScreenerHistory className="mt-12" results={results} sampleIds={sampleIds} />
      </motion.div>

      <motion.div variants={staggerChild}>
        <CrisisResources className="mt-12" />
      </motion.div>

      <motion.div variants={staggerChild}>
        <Card tone="sunken" padding="md" className="mt-8">
          <h2 className="font-sans text-sm font-semibold text-text">Where these come from</h2>
          {SCREENERS.map((screener) => (
            <p key={screener.id} className="mt-3 max-w-prose text-xs leading-relaxed text-text-subtle">
              <span className="font-medium text-text-muted">{screener.name}</span> —{' '}
              {screener.citation} {screener.licence}
            </p>
          ))}
        </Card>
      </motion.div>
    </motion.div>
  )
}

interface ScreenerCardProps {
  screener: Screener
  lastTakenISO: string | null
  today: string
  onBegin: () => void
}

function ScreenerCard({ screener, lastTakenISO, today, onBegin }: ScreenerCardProps) {
  const waitDays = lastTakenISO === null ? 0 : daysUntilRetake(lastTakenISO, today)

  return (
    <Card tone="raised" padding="md" as="article" className="flex flex-col">
      <h2 className="font-display text-2xl text-text">{screener.name}</h2>
      <p className="mt-1 text-sm text-text-subtle">{screener.fullName}</p>

      <p className="mt-3 max-w-prose flex-1 text-text-muted">{screener.about}</p>

      <p className="mt-4 flex items-center gap-2 text-sm text-text-subtle">
        <Clock aria-hidden="true" className="h-4 w-4" />
        {screener.duration} · {screener.questions.length} questions
      </p>

      {waitDays > 0 ? (
        <p className="mt-4 rounded-2xl bg-surface-muted p-3.5 text-sm text-text-muted">
          You took this recently. These questions ask about the last two weeks, so scores taken
          closer together than that mostly measure the same fortnight — {waitDays}{' '}
          {waitDays === 1 ? 'more day' : 'more days'} would make the comparison mean something. You
          can still take it now if things have changed.
        </p>
      ) : null}

      <Button
        className="mt-5"
        variant={waitDays > 0 ? 'secondary' : 'primary'}
        size="md"
        iconLeft={<ClipboardCheck className="h-4 w-4" />}
        iconRight={<ArrowRight className="h-3.5 w-3.5" />}
        onClick={onBegin}
      >
        {waitDays > 0 ? `Take the ${screener.name} anyway` : `Start the ${screener.name}`}
      </Button>
    </Card>
  )
}

export default SelfCheck
