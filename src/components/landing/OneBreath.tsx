import { motion, useReducedMotion } from 'framer-motion'
import { Wind } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

type Phase = 'idle' | 'in' | 'hold' | 'out' | 'done'

/** One 4-2-6 breath, the same rhythm the landing halo runs on. */
const SEQUENCE: readonly { phase: Exclude<Phase, 'idle' | 'done'>; label: string; ms: number }[] = [
  { phase: 'in', label: 'Breathe in', ms: 4000 },
  { phase: 'hold', label: 'Hold', ms: 2000 },
  { phase: 'out', label: 'Breathe out', ms: 6000 },
]

const COPY: Record<Phase, string> = {
  idle: 'Twelve seconds. No sign-up, no counting on your part.',
  in: 'Breathe in',
  hold: 'Hold',
  out: 'Breathe out',
  done: 'That was one. The app does this for as long as you like.',
}

/**
 * One breath, on the landing page, for anyone who is not ready to read a pitch.
 *
 * Everything else on this screen argues that Mindful might help. This does the
 * thing: press once and be led through a single 4-2-6 breath, twelve seconds,
 * before deciding anything. It is the smallest honest demonstration of the
 * product available.
 *
 * The bar is the timer and the instruction is the text — both, always, because
 * a person following a breathing cue with their eyes closed is exactly the
 * user this app was designed around. Under `prefers-reduced-motion` the bar
 * stops growing and the words alone carry the pace, which is the same
 * substitution the real breathing screen makes.
 */
export function OneBreath({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<number[]>([])

  // A component that leaves timers running after it unmounts will happily
  // setState into a dead tree.
  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  function start() {
    if (phase !== 'idle' && phase !== 'done') return

    timers.current.forEach(window.clearTimeout)
    timers.current = []

    let elapsed = 0
    for (const step of SEQUENCE) {
      timers.current.push(window.setTimeout(() => setPhase(step.phase), elapsed))
      elapsed += step.ms
    }
    timers.current.push(window.setTimeout(() => setPhase('done'), elapsed))
    setPhase('in')
  }

  const running = phase === 'in' || phase === 'hold' || phase === 'out'
  const current = SEQUENCE.find((step) => step.phase === phase)

  return (
    <div
      className={cn(
        'rounded-3xl border border-border bg-surface/85 p-5 shadow-soft backdrop-blur sm:p-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
          <Wind aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
          Take one breath
        </p>

        <button
          type="button"
          onClick={start}
          disabled={running}
          className={cn(
            'min-h-9 rounded-pill border border-border bg-surface px-4 text-sm font-medium text-text',
            'shadow-soft transition-colors duration-250 ease-calm',
            'hover:border-border-strong hover:bg-surface-muted',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-ring disabled:opacity-55',
          )}
        >
          {phase === 'done' ? 'Again' : running ? 'Following…' : 'Start'}
        </button>
      </div>

      {/* The instruction, in a polite live region so it is spoken as it changes. */}
      <p
        aria-live="polite"
        aria-atomic="true"
        className="mt-4 font-display text-2xl text-primary sm:text-3xl"
      >
        {running ? COPY[phase] : phase === 'done' ? 'Done' : 'Ready when you are'}
      </p>

      {/* The pace, drawn. Never the only cue — the words above say the same. */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-surface-muted">
        <motion.div
          aria-hidden="true"
          className="h-full rounded-pill bg-primary/70"
          initial={{ width: '0%' }}
          animate={{
            width: running ? (phase === 'out' ? '0%' : '100%') : phase === 'done' ? '0%' : '0%',
          }}
          transition={
            prefersReducedMotion || !current
              ? { duration: 0 }
              : { duration: current.ms / 1000, ease: [0.4, 0, 0.2, 1] }
          }
        />
      </div>

      <p className="mt-3 text-sm text-text-muted">{COPY[phase]}</p>
    </div>
  )
}

export default OneBreath
