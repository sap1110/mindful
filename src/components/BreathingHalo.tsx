import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'
import { motionTokens } from '../theme'

/** A 4-2-6 breath: in for four, hold for two, out for six. */
const PHASES = [
  { key: 'inhale', label: 'Breathe in', seconds: 4, scale: 1 },
  { key: 'hold', label: 'Hold', seconds: 2, scale: 1 },
  { key: 'exhale', label: 'Breathe out', seconds: 6, scale: 0.78 },
] as const

/**
 * The landing hero's living element: a slow guided breath, running before you
 * have signed up for anything. One state machine drives both the scale and the
 * caption so they can never drift apart.
 *
 * Entirely decorative — hidden from assistive tech, with a static description
 * instead, because a caption that changes every few seconds inside a live
 * region would be hostile to screen-reader users. Under
 * `prefers-reduced-motion` it holds still at rest.
 */
export function BreathingHalo({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const phase = PHASES[index]

  useEffect(() => {
    if (prefersReducedMotion) return
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % PHASES.length),
      phase.seconds * 1000,
    )
    return () => window.clearTimeout(timer)
  }, [index, phase.seconds, prefersReducedMotion])

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: phase.seconds, ease: motionTokens.ease.gentle }

  return (
    <div className={cn('relative isolate', className)}>
      <div
        aria-hidden="true"
        className="relative mx-auto grid aspect-square w-full max-w-[26rem] place-items-center"
      >
        {/* Outer ripples — same breath, trailing slightly behind. */}
        <motion.div
          className="absolute inset-0 rounded-full bg-sage-200/45 blur-2xl"
          animate={{ scale: prefersReducedMotion ? 0.92 : phase.scale * 1.04 }}
          transition={{ ...transition, delay: prefersReducedMotion ? 0 : 0.18 }}
        />
        <motion.div
          className="absolute inset-[9%] rounded-full border border-primary/15"
          animate={{ scale: prefersReducedMotion ? 0.94 : phase.scale }}
          transition={{ ...transition, delay: prefersReducedMotion ? 0 : 0.12 }}
        />
        <motion.div
          className="absolute inset-[19%] rounded-full border border-primary/25"
          animate={{ scale: prefersReducedMotion ? 0.94 : phase.scale }}
          transition={{ ...transition, delay: prefersReducedMotion ? 0 : 0.06 }}
        />

        {/* The core disc. */}
        <motion.div
          className={cn(
            'absolute inset-[29%] rounded-full border border-primary/20',
            'bg-gradient-to-br from-surface via-sage-50 to-mist-100 shadow-float',
          )}
          animate={{ scale: prefersReducedMotion ? 0.94 : phase.scale }}
          transition={transition}
        />

        {/* Caption, centred in the disc. */}
        <div className="relative z-10 text-center">
          <motion.p
            key={phase.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.duration.slow, ease: motionTokens.ease.calm }}
            className="font-display text-2xl text-primary"
          >
            {prefersReducedMotion ? 'Breathe' : phase.label}
          </motion.p>
          <p className="mt-1 text-2xs font-medium uppercase tracking-[0.18em] text-text-subtle">
            {prefersReducedMotion ? 'in four · hold two · out six' : 'four · two · six'}
          </p>
        </div>
      </div>

      <p className="sr-only">
        A decorative animation of a slow breathing rhythm: breathe in for four seconds, hold for
        two, breathe out for six.
      </p>
    </div>
  )
}

export default BreathingHalo
