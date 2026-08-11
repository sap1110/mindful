import { motion, useReducedMotion } from 'framer-motion'
import { Pause, Play, Square } from 'lucide-react'
import { useState } from 'react'
import { AppNav } from '../components/AppNav'
import { BreathGuideText } from '../components/breathe/BreathGuideText'
import { BreathingHalo } from '../components/BreathingHalo'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { useBreathingSession } from '../hooks/useBreathingSession'
import { useMindfulData } from '../hooks/useMindfulData'
import {
  BREATHING_PATTERNS,
  DEFAULT_PATTERN_ID,
  SESSION_LENGTHS,
  breathingPattern,
  sessionLength,
  type SessionLengthId,
} from '../lib/breathing'
import { describeDay, formatDuration } from '../lib/date'
import { staggerChild, staggerParent } from '../lib/motion'

/**
 * The guided breathing screen.
 *
 * The halo from Phase 1 does the visual work, driven here by the session clock
 * rather than its own, so the circle, the phase word and the round counter can
 * never disagree. Everything the animation says is also said in text, and when
 * the device asks for reduced motion the animation is *replaced* by a text
 * guide that paces the session identically — not simply switched off.
 */
export function Breathe() {
  const prefersReducedMotion = useReducedMotion()
  const { breathing } = useMindfulData()

  const [patternId, setPatternId] = useState<string>(DEFAULT_PATTERN_ID)
  const [lengthId, setLengthId] = useState<SessionLengthId>('medium')

  const pattern = breathingPattern(patternId)
  const length = sessionLength(lengthId)
  const session = useBreathingSession(pattern, length.minutes)

  const isRunning = session.status === 'running'
  const isPaused = session.status === 'paused'
  const isComplete = session.status === 'complete'
  const isChoosing = session.status === 'idle'

  const recent = breathing.slice(0, 4)

  return (
    <PageShell nav={<AppNav />}>
      <motion.div variants={staggerParent} initial="hidden" animate="visible">
        <motion.h1 variants={staggerChild} className="text-display-xs text-text sm:text-display-sm">
          Breathe
        </motion.h1>

        <motion.p variants={staggerChild} className="mt-3 max-w-prose text-lg text-text-muted">
          {prefersReducedMotion
            ? 'Pick a rhythm and follow the words. Stop whenever you like.'
            : 'Pick a rhythm and follow the circle. Stop whenever you like.'}
        </motion.p>

        <motion.section variants={staggerChild} className="mt-8" aria-labelledby="pattern-heading">
          <h2 id="pattern-heading" className="sr-only">
            Choose a rhythm and a length
          </h2>

          <fieldset className="border-0 p-0" disabled={!isChoosing}>
            <legend className="mb-3 text-sm font-medium text-text">Rhythm</legend>
            <div className="grid grid-cols-3 gap-2">
              {BREATHING_PATTERNS.map((option) => (
                <Chip
                  key={option.id}
                  selectionMode="single"
                  shape="panel"
                  name="breathing-pattern"
                  value={option.id}
                  label={option.name}
                  detail={option.rhythm}
                  checked={option.id === patternId}
                  onChange={() => setPatternId(option.id)}
                />
              ))}
            </div>
            <p className="mt-2.5 text-sm text-text-muted">{pattern.description}</p>
          </fieldset>

          <fieldset className="mt-6 border-0 p-0" disabled={!isChoosing}>
            <legend className="mb-3 text-sm font-medium text-text">How long</legend>
            <div className="flex flex-wrap gap-2">
              {SESSION_LENGTHS.map((option) => (
                <Chip
                  key={option.id}
                  selectionMode="single"
                  name="session-length"
                  value={option.id}
                  label={option.label}
                  checked={option.id === lengthId}
                  onChange={() => setLengthId(option.id)}
                />
              ))}
            </div>
          </fieldset>
        </motion.section>

        <motion.section variants={staggerChild} className="mt-9" aria-labelledby="session-heading">
          <h2 id="session-heading" className="sr-only">
            Your session
          </h2>

          <Card tone="raised" padding="md">
            {prefersReducedMotion ? (
              <BreathGuideText
                pattern={pattern}
                phase={session.phase}
                phaseIndex={session.phaseIndex}
                secondsLeft={session.secondsLeft}
                isRunning={isRunning}
                className="border-0 p-0 shadow-none"
              />
            ) : (
              <BreathingHalo
                className="mx-auto max-w-xs"
                phase={{
                  key: `${session.phaseIndex}-${session.round}`,
                  label: isRunning || isPaused ? session.phase.label : 'Ready when you are',
                  seconds: session.phase.seconds,
                  scale: session.phase.scale,
                }}
                count={isRunning || isPaused ? session.secondsLeft : undefined}
                caption={`${pattern.name} · ${pattern.rhythm}`}
                still={!isRunning}
                description={`A circle that grows and shrinks with the ${pattern.name} rhythm, ${pattern.rhythm}. The same instructions are written out below.`}
              />
            )}

            {/* The phase in text, always — the animation is never the only cue. */}
            <p className="mt-4 text-center text-lg text-text">
              <span aria-live="polite" aria-atomic="true" className="font-medium">
                {isRunning ? session.phase.label : isPaused ? 'Paused' : 'Not started'}
              </span>
              {isRunning || isPaused ? (
                <span className="text-text-muted"> · {session.secondsLeft}s left in this step</span>
              ) : null}
            </p>

            <p className="mt-1 text-center text-sm text-text-muted">
              Round {session.round} of {session.totalRounds}
              {session.elapsedMs > 0 ? ` · ${formatDuration(session.elapsedMs)} so far` : null}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {isChoosing ? (
                <Button size="lg" iconLeft={<Play className="h-4 w-4" />} onClick={session.start}>
                  Begin
                </Button>
              ) : null}

              {isRunning ? (
                <Button
                  size="lg"
                  variant="secondary"
                  iconLeft={<Pause className="h-4 w-4" />}
                  onClick={session.pause}
                >
                  Pause
                </Button>
              ) : null}

              {isPaused ? (
                <Button size="lg" iconLeft={<Play className="h-4 w-4" />} onClick={session.resume}>
                  Resume
                </Button>
              ) : null}

              {isRunning || isPaused ? (
                <Button
                  size="lg"
                  variant="secondary"
                  iconLeft={<Square className="h-4 w-4" />}
                  onClick={session.stop}
                >
                  Stop
                </Button>
              ) : null}

              {isComplete ? (
                <Button size="lg" iconLeft={<Play className="h-4 w-4" />} onClick={session.reset}>
                  Start another
                </Button>
              ) : null}
            </div>

            <p role="status" aria-live="polite" className="mt-4 min-h-[1.5rem] text-center text-sm text-success">
              {isComplete && session.lastSession
                ? `Session recorded — ${
                    session.lastSession.completedCycles === 0
                      ? 'less than a full round'
                      : `${session.lastSession.completedCycles} ${
                          session.lastSession.completedCycles === 1 ? 'round' : 'rounds'
                        }`
                  }, ${formatDuration(session.lastSession.durationMs)}. Nothing else to do.`
                : ''}
            </p>

            <p className="mt-2 text-center text-sm text-text-subtle">
              No sound, no streaks here. Stopping early still counts as breathing.
            </p>
          </Card>
        </motion.section>

        {recent.length > 0 ? (
          <motion.section variants={staggerChild} className="mt-12" aria-labelledby="sessions-heading">
            <h2
              id="sessions-heading"
              className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
            >
              Recent sessions
            </h2>
            <ul className="mt-3 space-y-2">
              {recent.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-soft"
                >
                  <span className="font-medium text-text">
                    {breathingPattern(entry.patternId).name} · {formatDuration(entry.durationMs)}
                  </span>
                  <span className="text-text-muted">
                    {entry.completedCycles} {entry.completedCycles === 1 ? 'round' : 'rounds'} ·{' '}
                    {describeDay(entry.completedAt.slice(0, 10))}
                  </span>
                </li>
              ))}
            </ul>
          </motion.section>
        ) : null}
      </motion.div>
    </PageShell>
  )
}

export default Breathe
