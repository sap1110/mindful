import { cn } from '../../lib/cn'
import { Overlay } from '../ui/Overlay'

export type EyesClosedStage = 'lead-in' | 'running' | 'paused'

export interface EyesClosedSessionProps {
  stage: EyesClosedStage
  /** The current step, e.g. "Breathe in". Ignored during the lead-in. */
  phaseLabel: string
  secondsLeft: number
  round: number
  totalRounds: number
  /** Pause, or resume when already paused. Also what a tap anywhere does. */
  onToggle: () => void
  onStop: () => void
  /** Abandon the lead-in before the session starts. */
  onCancel: () => void
}

/**
 * The screen you are not meant to look at.
 *
 * Once the voice is leading, the display has one job left: stop being a
 * display. It goes to a dark, low-light surface, drops to one word at a time,
 * and turns the entire area into a single pause target — nobody with their
 * eyes shut is going to find a 44-pixel button, so the button is the screen.
 * Escape stops, for the same reason.
 *
 * The written word stays on screen throughout even though it is not the point.
 * Someone who opens their eyes mid-session, or who turned the dimmed mode on
 * without ever hearing the voice, still gets a paced session rather than a
 * black rectangle.
 *
 * Nothing here is a live region: the app's own voice is announcing every step
 * already, and a second announcement of the same word over the top of it would
 * make the guide unusable for exactly the people relying on it most.
 */
export function EyesClosedSession({
  stage,
  phaseLabel,
  secondsLeft,
  round,
  totalRounds,
  onToggle,
  onStop,
  onCancel,
}: EyesClosedSessionProps) {
  const isLeadIn = stage === 'lead-in'
  const isPaused = stage === 'paused'

  return (
    <Overlay
      label="Eyes-closed breathing session"
      onDismiss={isLeadIn ? onCancel : onStop}
      opaque
      className={cn(
        'flex flex-col bg-sage-900 text-sage-100',
        'animate-fade-in motion-reduce:animate-none',
      )}
    >
      <button
        data-autofocus
        type="button"
        onClick={isLeadIn ? onCancel : onToggle}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center',
          'outline-none focus-visible:outline focus-visible:outline-2',
          'focus-visible:-outline-offset-4 focus-visible:outline-sage-200',
        )}
      >
        <span className="sr-only">
          {isLeadIn
            ? 'Cancel before the session starts'
            : isPaused
              ? 'Resume the session'
              : 'Pause the session'}
        </span>

        {isLeadIn ? (
          <span aria-hidden="true" className="block space-y-4">
            <span className="block font-display text-display-sm text-sage-50 sm:text-display-md">
              Close your eyes
            </span>
            <span className="block max-w-sm text-lg text-sage-200">
              Get comfortable. The voice takes it from here — you won&rsquo;t need the screen.
            </span>
          </span>
        ) : (
          <span aria-hidden="true" className="block space-y-3">
            <span className="block font-display text-display-md text-sage-50 sm:text-display-lg">
              {isPaused ? 'Paused' : phaseLabel}
            </span>
            <span className="block font-display text-display-sm font-light tabular-nums text-sage-200">
              {secondsLeft}
            </span>
            <span className="block text-sm uppercase tracking-[0.18em] text-sage-300">
              Round {round} of {totalRounds}
            </span>
          </span>
        )}

        <span aria-hidden="true" className="mt-6 block max-w-xs text-sm text-sage-300">
          {isLeadIn
            ? 'Tap anywhere to cancel.'
            : isPaused
              ? 'Tap anywhere to carry on.'
              : 'Tap anywhere to pause. Keep your eyes closed — nothing here needs looking at.'}
        </span>
      </button>

      <div className="flex justify-center px-6 pb-10 pt-4">
        <button
          type="button"
          onClick={isLeadIn ? onCancel : onStop}
          className={cn(
            'min-h-11 rounded-pill border border-sage-600 px-6 py-2.5 text-sage-100',
            'transition-colors duration-250 ease-calm hover:bg-sage-800',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-sage-200',
          )}
        >
          {isLeadIn ? 'Cancel' : 'Stop and go back'}
          <span className="sr-only"> — or press Escape</span>
        </button>
      </div>
    </Overlay>
  )
}

export default EyesClosedSession
