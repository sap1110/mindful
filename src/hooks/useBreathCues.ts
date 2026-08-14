import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PAUSED_CUE,
  RESUMED_CUE,
  closingCue,
  introScript,
  phaseCue,
  stoppedCue,
} from '../lib/breathCues'
import type { BreathingPattern } from '../lib/breathing'
import type { UseBreathingSession } from './useBreathingSession'
import type { VoiceGuide } from './useVoiceGuide'

export interface UseBreathCuesOptions {
  session: UseBreathingSession
  guide: VoiceGuide
  pattern: BreathingPattern
  minutes: number
  eyesClosed: boolean
}

export interface UseBreathCues {
  /** The lead-in is being spoken. The clock has not started yet. */
  preparing: boolean
  /** Speak the lead-in, then start. Starts immediately when the voice is off. */
  begin: () => void
  /** Abandon the lead-in before the session begins. */
  cancelPreparing: () => void
  pause: () => void
  resume: () => void
  stop: () => void
}

/**
 * The voice, wired to the session clock.
 *
 * Cues are driven by *state changes*, not by timers of their own — there is
 * still exactly one clock in this feature, and the voice reads from it like
 * everything else on the screen, so the spoken step can never disagree with
 * the written one.
 *
 * The lead-in is the one place speech drives timing rather than following it:
 * the session waits for "starting now" to finish before the first breath, so
 * nobody is told to breathe in over the top of the instructions.
 */
export function useBreathCues({
  session,
  guide,
  pattern,
  minutes,
  eyesClosed,
}: UseBreathCuesOptions): UseBreathCues {
  const [preparing, setPreparing] = useState(false)

  const { say, stop: stopVoice } = guide
  const { start, pause: pauseSession, resume: resumeSession, stop: stopSession } = session

  /** Identifies the current lead-in, so an abandoned one cannot start a session. */
  const introToken = useRef(0)
  /** The last phase spoken, as `round:phaseIndex`. Cleared whenever we are not running. */
  const spoken = useRef<string | null>(null)
  /** Prepended to the next phase cue — used to say "carrying on" before the step. */
  const prefix = useRef<string | null>(null)
  /** A session that ended because someone stopped it, not because it finished. */
  const stoppedEarly = useRef(false)

  const cancelPreparing = useCallback(() => {
    introToken.current += 1
    stopVoice()
    setPreparing(false)
  }, [stopVoice])

  const begin = useCallback(() => {
    stoppedEarly.current = false
    spoken.current = null
    prefix.current = null

    if (!guide.prefs.enabled) {
      start()
      return
    }

    introToken.current += 1
    const token = introToken.current
    setPreparing(true)

    void say(introScript({ pattern, minutes, eyesClosed })).then(() => {
      // Someone pressed cancel, or started again, while this was being read.
      if (introToken.current !== token) return
      setPreparing(false)
      start()
    })
  }, [eyesClosed, guide.prefs.enabled, minutes, pattern, say, start])

  const pause = useCallback(() => {
    pauseSession()
    void say(PAUSED_CUE)
  }, [pauseSession, say])

  const resume = useCallback(() => {
    // Spoken by the phase-cue effect rather than here, so "carrying on" and the
    // step that follows it are one uninterrupted sentence.
    prefix.current = RESUMED_CUE
    resumeSession()
  }, [resumeSession])

  const stop = useCallback(() => {
    stoppedEarly.current = true
    stopSession()
    void say(stoppedCue())
  }, [say, stopSession])

  // One cue at the top of each phase.
  useEffect(() => {
    if (session.status !== 'running') {
      spoken.current = null
      return
    }

    const key = `${session.round}:${session.phaseIndex}`
    if (spoken.current === key) return
    spoken.current = key

    const cue = phaseCue({
      phase: session.phase,
      phaseIndex: session.phaseIndex,
      round: session.round,
      totalRounds: session.totalRounds,
    })

    const lead = prefix.current
    prefix.current = null
    void say(lead ? `${lead} ${cue}` : cue)
  }, [
    say,
    session.phase,
    session.phaseIndex,
    session.round,
    session.status,
    session.totalRounds,
  ])

  // The closing words, only when the session ran itself out.
  useEffect(() => {
    if (session.status !== 'complete' || stoppedEarly.current) return
    void say(closingCue(session.lastSession?.completedCycles ?? session.totalRounds, eyesClosed))
  }, [eyesClosed, say, session.status, session.lastSession, session.totalRounds])

  return { preparing, begin, cancelPreparing, pause, resume, stop }
}
