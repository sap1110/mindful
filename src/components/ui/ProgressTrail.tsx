import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { motionTokens } from '../../theme'

export interface ProgressTrailProps {
  steps: readonly string[]
  /** Zero-based index of the step currently on screen. */
  current: number
  className?: string
}

/**
 * Onboarding progress. Rendered as a real ordered list inside a labelled
 * `<nav>`: sighted users get three widening bars, screen-reader users get
 * "Step 2 of 3, What brings you here — current step".
 */
export function ProgressTrail({ steps, current, className }: ProgressTrailProps) {
  return (
    <nav aria-label="Onboarding progress" className={className}>
      <ol className="flex items-center gap-2">
        {steps.map((label, index) => {
          const isDone = index < current
          const isCurrent = index === current

          return (
            <li key={label} aria-current={isCurrent ? 'step' : undefined} className="flex">
              <span
                aria-hidden="true"
                className={cn(
                  'block h-1.5 overflow-hidden rounded-pill bg-surface-sunken',
                  'transition-[width] duration-600 ease-calm',
                  isCurrent ? 'w-10' : 'w-6',
                )}
              >
                <motion.span
                  className="block h-full rounded-pill bg-primary"
                  initial={false}
                  animate={{ scaleX: isDone || isCurrent ? 1 : 0 }}
                  style={{ originX: 0 }}
                  transition={{
                    duration: motionTokens.duration.slow,
                    ease: motionTokens.ease.calm,
                  }}
                />
              </span>
              <span className="sr-only">
                {`Step ${index + 1} of ${steps.length}, ${label}`}
                {isCurrent ? ' — current step' : isDone ? ' — done' : ''}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default ProgressTrail
