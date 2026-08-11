import { cn } from '../../lib/cn'
import type { BreathPhase, BreathingPattern } from '../../lib/breathing'

export interface BreathGuideTextProps {
  pattern: BreathingPattern
  phase: BreathPhase
  phaseIndex: number
  secondsLeft: number
  isRunning: boolean
  className?: string
}

/**
 * The reduced-motion guide.
 *
 * When someone has asked their system for less motion, freezing the halo would
 * leave them with no pacing at all, so the animation is replaced rather than
 * disabled: the phase word, a plain seconds countdown, and the whole rhythm
 * written out with the current step marked. Nothing moves, and the session is
 * still led at exactly the same pace by the same clock.
 *
 * The phase word sits in a polite live region so it is spoken as it changes —
 * that is the entire point of the guide — while the countdown is not, because
 * hearing "four, three, two, one" over the top would be unusable.
 */
export function BreathGuideText({
  pattern,
  phase,
  phaseIndex,
  secondsLeft,
  isRunning,
  className,
}: BreathGuideTextProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-border bg-surface p-6 text-center shadow-soft sm:p-8',
        className,
      )}
    >
      <p
        aria-live="polite"
        aria-atomic="true"
        className="font-display text-display-xs text-primary sm:text-display-sm"
      >
        {isRunning ? phase.label : 'Ready when you are'}
      </p>

      <p className="mt-1 font-display text-display-sm font-light tabular-nums text-primary">
        {isRunning ? secondsLeft : phase.seconds}
        <span className="sr-only"> seconds</span>
      </p>

      <ol className="mt-6 flex flex-wrap justify-center gap-2">
        {pattern.phases.map((step, index) => {
          const isNow = isRunning && index === phaseIndex
          return (
            <li
              key={`${step.kind}-${index}`}
              className={cn(
                'rounded-pill border px-3 py-1.5 text-sm',
                isNow
                  ? 'border-primary bg-primary-soft font-semibold text-primary-hover'
                  : 'border-border bg-surface-muted text-text-muted',
              )}
            >
              {step.label} {step.seconds}
              <span className="sr-only"> seconds</span>
              <span aria-hidden="true">s</span>
              {isNow ? <span className="sr-only"> — now</span> : null}
            </li>
          )
        })}
      </ol>

      <p className="mt-5 text-sm text-text-muted">
        Motion is turned down on this device, so the words lead instead of the circle.
      </p>
    </div>
  )
}

export default BreathGuideText
