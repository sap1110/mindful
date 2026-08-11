import { useCallback, useEffect, useRef, useState } from 'react'
import { roundsFor, type BreathPhase, type BreathingPattern } from '../lib/breathing'
import { recordBreathingSession, type BreathingSession } from '../lib/storage'

export type BreathingStatus = 'idle' | 'running' | 'paused' | 'complete'

interface Engine {
  phaseIndex: number
  /** Milliseconds spent in the current phase. */
  phaseElapsedMs: number
  /** Rounds of the full pattern finished so far. */
  cycles: number
  elapsedMs: number
  finished: boolean
}

const START: Engine = {
  phaseIndex: 0,
  phaseElapsedMs: 0,
  cycles: 0,
  elapsedMs: 0,
  finished: false,
}

/** Advance the clock by `delta` milliseconds. Pure, so the tick is testable. */
function advance(
  state: Engine,
  delta: number,
  pattern: BreathingPattern,
  totalRounds: number,
): Engine {
  let { phaseIndex, phaseElapsedMs, cycles } = state
  const elapsedMs = state.elapsedMs + delta
  phaseElapsedMs += delta

  // A tab that was backgrounded can hand us a very large delta; walk the
  // phases rather than jumping, so the round count stays honest.
  let guard = 0
  while (phaseElapsedMs >= pattern.phases[phaseIndex].seconds * 1000 && guard < 500) {
    phaseElapsedMs -= pattern.phases[phaseIndex].seconds * 1000
    phaseIndex += 1
    guard += 1

    if (phaseIndex >= pattern.phases.length) {
      phaseIndex = 0
      cycles += 1
      if (cycles >= totalRounds) {
        return { phaseIndex: 0, phaseElapsedMs: 0, cycles, elapsedMs, finished: true }
      }
    }
  }

  return { phaseIndex, phaseElapsedMs, cycles, elapsedMs, finished: false }
}

const TICK_MS = 100

export interface UseBreathingSession {
  status: BreathingStatus
  phase: BreathPhase
  phaseIndex: number
  /** Whole seconds remaining in the current phase, counting down to 1. */
  secondsLeft: number
  /** 1-based round currently in progress. */
  round: number
  totalRounds: number
  elapsedMs: number
  /** The record written when the last session ended, for the summary line. */
  lastSession: BreathingSession | null
  start: () => void
  pause: () => void
  resume: () => void
  /** Stop early. The partial session is still recorded — it still happened. */
  stop: () => void
  /** Clear the summary and go back to the chooser. */
  reset: () => void
}

/**
 * The clock behind a guided breathing session.
 *
 * One state machine owns the phase, the countdown and the round count, so the
 * animation, the spoken label and the text guide are always the same session
 * rather than three timers that drift apart. It is deliberately independent of
 * the visuals: under `prefers-reduced-motion` the /breathe screen renders a
 * text guide instead of the halo, driven by exactly this hook.
 */
export function useBreathingSession(
  pattern: BreathingPattern,
  minutes: number,
): UseBreathingSession {
  const totalRounds = roundsFor(pattern, minutes)
  const [status, setStatus] = useState<BreathingStatus>('idle')
  const [engine, setEngine] = useState<Engine>(START)
  const [lastSession, setLastSession] = useState<BreathingSession | null>(null)

  // Read by the completion effect without making it re-run every tick.
  const engineRef = useRef(engine)
  engineRef.current = engine

  // Changing the pattern or the length between sessions starts a fresh one.
  useEffect(() => {
    setStatus((current) => (current === 'running' || current === 'paused' ? current : 'idle'))
    setEngine((current) => (current.elapsedMs === 0 ? current : START))
  }, [pattern.id, minutes])

  useEffect(() => {
    if (status !== 'running') return

    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const delta = now - last
      last = now
      setEngine((current) => advance(current, delta, pattern, totalRounds))
    }, TICK_MS)

    return () => window.clearInterval(id)
  }, [status, pattern, totalRounds])

  // Completion is recorded once, from an effect, so the tick stays pure.
  useEffect(() => {
    if (!engine.finished || status !== 'running') return
    setStatus('complete')
    setLastSession(
      recordBreathingSession({
        patternId: pattern.id,
        completedCycles: engine.cycles,
        durationMs: engine.elapsedMs,
      }),
    )
  }, [engine.finished, engine.cycles, engine.elapsedMs, pattern.id, status])

  const start = useCallback(() => {
    setEngine(START)
    setLastSession(null)
    setStatus('running')
  }, [])

  const pause = useCallback(() => {
    setStatus((current) => (current === 'running' ? 'paused' : current))
  }, [])

  const resume = useCallback(() => {
    setStatus((current) => (current === 'paused' ? 'running' : current))
  }, [])

  const stop = useCallback(() => {
    const current = engineRef.current

    // Nothing happened yet — go quietly back to the chooser instead of
    // recording a zero-length session.
    if (current.elapsedMs <= 0) {
      setEngine(START)
      setStatus('idle')
      return
    }

    setStatus('complete')
    setLastSession(
      recordBreathingSession({
        patternId: pattern.id,
        completedCycles: current.cycles,
        durationMs: current.elapsedMs,
      }),
    )
  }, [pattern.id])

  const reset = useCallback(() => {
    setEngine(START)
    setLastSession(null)
    setStatus('idle')
  }, [])

  const phase = pattern.phases[engine.phaseIndex]
  const secondsLeft = Math.max(1, Math.ceil(phase.seconds - engine.phaseElapsedMs / 1000))

  return {
    status,
    phase,
    phaseIndex: engine.phaseIndex,
    secondsLeft: status === 'idle' ? phase.seconds : secondsLeft,
    round: Math.min(engine.cycles + 1, totalRounds),
    totalRounds,
    elapsedMs: engine.elapsedMs,
    lastSession,
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
