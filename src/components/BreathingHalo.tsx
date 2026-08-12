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

export interface HaloPhase {
  key: string
  label: string
  seconds: number
  /** Size the disc should be *heading towards* over this phase's duration. */
  scale: number
}

export interface BreathingHaloProps {
  className?: string
  /**
   * Drive the halo from outside — the guided session on /breathe owns its own
   * clock so the circle, the phase word and the round count cannot disagree.
   * Omit it and the halo runs its own quiet 4-2-6 loop, as on the landing page.
   */
  phase?: HaloPhase
  /** Replaces the rhythm caption under the phase word. */
  caption?: string
  /** A large figure inside the disc, e.g. seconds left in this phase. */
  count?: number
  /** Hold at rest: idle before a session, or paused part-way through one. */
  still?: boolean
  /** Description for assistive tech when the halo is not purely decorative. */
  description?: string
}

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
export function BreathingHalo({
  className,
  phase: controlledPhase,
  caption,
  count,
  still,
  description,
}: BreathingHaloProps) {
  const prefersReducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const isControlled = controlledPhase !== undefined
  const phase: HaloPhase = controlledPhase ?? PHASES[index]

  useEffect(() => {
    if (prefersReducedMotion || isControlled) return
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % PHASES.length),
      phase.seconds * 1000,
    )
    return () => window.clearTimeout(timer)
  }, [index, isControlled, phase.seconds, prefersReducedMotion])

  const atRest = prefersReducedMotion || still === true
  const transition = atRest
    ? { duration: motionTokens.duration.slow, ease: motionTokens.ease.gentle }
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
          animate={{ scale: atRest ? 0.92 : phase.scale * 1.04 }}
          transition={{ ...transition, delay: atRest ? 0 : 0.18 }}
        />
        <motion.div
          className="absolute inset-[9%] rounded-full border border-primary/15"
          animate={{ scale: atRest ? 0.94 : phase.scale }}
          transition={{ ...transition, delay: atRest ? 0 : 0.12 }}
        />
        <motion.div
          className="absolute inset-[19%] rounded-full border border-primary/25"
          animate={{ scale: atRest ? 0.94 : phase.scale }}
          transition={{ ...transition, delay: atRest ? 0 : 0.06 }}
        />

        {/* The core disc. */}
        <motion.div
          className={cn(
            'absolute inset-[29%] rounded-full border border-primary/20',
            'bg-gradient-to-br from-surface via-sage-50 to-mist-100 shadow-float',
          )}
          animate={{ scale: atRest ? 0.94 : phase.scale }}
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
            {isControlled || !prefersReducedMotion ? phase.label : 'Breathe'}
          </motion.p>

          {count === undefined ? null : (
            <p className="font-display text-display-sm font-light leading-tight text-primary tabular-nums">
              {count}
            </p>
          )}

          <p className="mt-1 text-2xs font-medium uppercase tracking-[0.18em] text-text-subtle">
            {caption ?? (prefersReducedMotion ? 'in four · hold two · out six' : 'four · two · six')}
          </p>
        </div>
      </div>

      <p className="sr-only">
        {description ??
          'A decorative animation of a slow breathing rhythm: breathe in for four seconds, hold for two, breathe out for six.'}
      </p>
    </div>
  )
}

export default BreathingHalo
