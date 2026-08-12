import { motion } from 'framer-motion'
import { ArrowRight, NotebookPen, RotateCcw, Wind } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { formatLongDay, todayISO } from '../../lib/date'
import {
  compareScores,
  describeChange,
  type Screener,
  type ScreenerOutcome,
} from '../../lib/screener'
import { staggerChild, staggerParent } from '../../lib/motion'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { CrisisResources } from '../crisis/CrisisResources'
import { ScoreScale } from './ScoreScale'

export interface ResultPanelProps {
  screener: Screener
  outcome: ScreenerOutcome
  /** The score before this one, for the same instrument. `null` on a first run. */
  previousScore: number | null
  onRetake: () => void
  className?: string
}

/**
 * What the answers came to.
 *
 * The ordering on this screen is the safety design, so it is worth stating: when
 * the risk item has been answered above "Not at all", crisis routing is rendered
 * *before* the score, not after it. A person who has just said they have thought
 * about hurting themselves should not have to scroll past a number and a bar
 * chart to reach a phone line — and their total might still be low, which is
 * exactly the case a score-first layout would bury.
 *
 * The number itself is deliberately undersold: the band label is the heading,
 * "17 of 27" is the supporting detail, and the words around both are careful to
 * describe a questionnaire rather than a person.
 */
export function ResultPanel({
  screener,
  outcome,
  previousScore,
  onRetake,
  className,
}: ResultPanelProps) {
  const direction = compareScores(outcome.score, previousScore)
  const delta = previousScore === null ? 0 : outcome.score - previousScore

  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      animate="visible"
      className={cn('space-y-6', className)}
    >
      {outcome.riskFlagged ? (
        <motion.div variants={staggerChild}>
          <Card tone="raised" padding="md" className="border-accent/50 bg-accent-soft/45">
            <h2 className="font-display text-2xl text-text">
              You said you have had thoughts of being better off dead, or of hurting yourself.
            </h2>
            <p className="mt-3 max-w-prose text-text-muted">
              Thank you for answering that honestly — it is the hardest question on here. That
              answer matters more than the score below it, whatever the total came to, and it is
              worth telling someone today. Not because something is wrong with you, but because
              carrying it alone is harder than it needs to be.
            </p>
          </Card>
        </motion.div>
      ) : null}

      {outcome.riskFlagged ? (
        <motion.div variants={staggerChild}>
          <CrisisResources tone="urgent" heading="Please talk to someone" />
        </motion.div>
      ) : null}

      <motion.div variants={staggerChild}>
        <Card tone="raised" padding="lg">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {screener.name} · {formatLongDay(todayISO())}
          </p>

          <h2 className="mt-3 text-display-xs text-text sm:text-display-sm">
            {outcome.band.label} range
          </h2>

          <p className="mt-2 text-lg text-text-muted">
            <span className="font-medium text-text">
              {outcome.score} of {outcome.max}
            </span>{' '}
            · {outcome.band.summary}
          </p>

          <ScoreScale
            className="mt-8"
            screener={screener}
            score={outcome.score}
            band={outcome.band}
          />

          <p className="mt-8 max-w-prose text-text-muted">{outcome.band.guidance}</p>

          <p
            className={cn(
              'mt-5 inline-flex items-center rounded-pill px-3.5 py-1.5 text-sm font-medium',
              direction === 'improved' && 'bg-success-soft text-success-fg',
              direction === 'worsened' && 'bg-accent-soft text-accent-hover',
              (direction === 'steady' || direction === 'first') &&
                'bg-surface-muted text-text-muted',
            )}
          >
            {describeChange(direction, delta)}
          </p>
        </Card>
      </motion.div>

      <motion.div variants={staggerChild}>
        <Card tone="sunken" padding="md">
          <h2 className="font-sans text-base font-semibold text-text">
            This is a questionnaire, not a diagnosis
          </h2>
          <p className="mt-2.5 max-w-prose text-sm text-text-muted">
            The {screener.name} is a screening tool. It can say that your answers today look like
            the answers of people who went on to be assessed — it cannot say what is happening to
            you, and a score of any size is not a condition. Only a qualified professional can make
            that call, and this result is a useful thing to bring them.
          </p>
          <p className="mt-2.5 max-w-prose text-sm text-text-muted">
            A single result is also just one fortnight. How it moves over time tends to say more
            than any one number.
          </p>
        </Card>
      </motion.div>

      <motion.div variants={staggerChild} className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="md" iconLeft={<RotateCcw className="h-4 w-4" />} onClick={onRetake}>
          Take it again
        </Button>
        <Link
          to="/breathe"
          className="inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Wind aria-hidden="true" className="h-4 w-4" />
          Breathe for a few minutes
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
        <Link
          to="/journal"
          className="inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <NotebookPen aria-hidden="true" className="h-4 w-4" />
          Write about it
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      {outcome.riskFlagged ? null : (
        <motion.div variants={staggerChild}>
          <CrisisResources tone="quiet" />
        </motion.div>
      )}
    </motion.div>
  )
}

export default ResultPanel
