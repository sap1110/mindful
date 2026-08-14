import { CircleCheck, Lock } from 'lucide-react'
import { useState } from 'react'
import {
  MIN_STAGE_HOURS,
  TOLERANCE_OPTIONS,
  advance,
  canAdvance,
  regress,
  stagesFor,
  startProtocol,
  type ProtocolState,
  type Tolerance,
} from '../../lib/concussion/protocol'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'

export interface ProtocolTrackerProps {
  state: ProtocolState | null
  onChange: (next: ProtocolState) => void
  onStop: () => void
}

/**
 * The ladder, with the rules doing the work.
 *
 * Everything on this card is arranged so that the safe thing is the easy thing.
 * The next stage is not a button that is always there and sometimes complains
 * — it is a button that does not appear until the 24 hours are up, with the
 * reason it is not there written where it would have been. "Today was harder"
 * sits right next to it, the same size, because going back a stage is a normal
 * part of this protocol rather than a failure to be buried.
 *
 * The clearance switch is the one place the app hands responsibility back. It
 * says what it is — a record of something a clinician told you — and it cannot
 * be reached by anything the app decides on its own.
 */
export function ProtocolTracker({ state, onChange, onStop }: ProtocolTrackerProps) {
  const [tolerance, setTolerance] = useState<Tolerance>('fine')

  if (!state) {
    return (
      <Card tone="raised" padding="md">
        <h3 className="font-sans text-lg font-medium text-text">Start a return plan</h3>
        <p className="mt-2 max-w-prose text-text-muted">
          Two ladders, from the Amsterdam consensus. Getting back to school or work comes first —
          if you cannot sit through a lesson or a shift, you are not ready for training, and the
          consensus is explicit that learning takes precedence.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => onChange(startProtocol('learn'))}>
            Back to learning or work
          </Button>
          <Button size="lg" variant="secondary" onClick={() => onChange(startProtocol('sport'))}>
            Back to sport
          </Button>
        </div>
      </Card>
    )
  }

  const stages = stagesFor(state.track)
  const check = canAdvance(state, tolerance)
  const isLast = state.stage >= stages.length
  const trackName = state.track === 'learn' ? 'learning or work' : 'sport'

  return (
    <Card tone="raised" padding="md">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-sans text-lg font-medium text-text">
          Getting back to {trackName}
        </h3>
        <p className="text-sm text-text-subtle">
          Stage {state.stage} of {stages.length}
        </p>
      </div>

      <ol className="mt-5 space-y-2">
        {stages.map((entry) => {
          const done = entry.number < state.stage
          const now = entry.number === state.stage
          return (
            <li
              key={entry.number}
              aria-current={now ? 'step' : undefined}
              className={cn(
                'rounded-2xl border px-4 py-3',
                now
                  ? 'border-primary bg-primary-soft/45'
                  : done
                    ? 'border-border bg-surface-muted/60'
                    : 'border-border bg-surface',
              )}
            >
              <p className="flex flex-wrap items-center gap-2 text-base font-medium text-text">
                {done ? (
                  <CircleCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-success" />
                ) : null}
                {entry.number}. {entry.name}
                {done ? <span className="sr-only"> — done</span> : null}
                {now ? (
                  <span className="rounded-pill bg-primary px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em] text-primary-fg">
                    You are here
                  </span>
                ) : null}
                {entry.needsClearance ? (
                  <span className="inline-flex items-center gap-1 text-xs font-normal text-text-subtle">
                    <Lock aria-hidden="true" className="h-3 w-3" />
                    needs a clinician
                  </span>
                ) : null}
              </p>
              {now ? (
                <>
                  <p className="mt-1.5 max-w-prose text-sm text-text-muted">{entry.activity}</p>
                  <p className="mt-1 text-sm text-text-subtle">Aim: {entry.aim}</p>
                </>
              ) : null}
            </li>
          )
        })}
      </ol>

      {isLast ? (
        <p className="mt-5 rounded-2xl bg-success-soft p-4 text-text">
          That is the last stage of this ladder. Keep an eye on how you feel — if symptoms come
          back, tell whoever is looking after you rather than pushing through.
        </p>
      ) : (
        <div className="mt-6">
          <fieldset className="border-0 p-0">
            <legend className="mb-2 text-sm font-medium text-text">
              How did stage {state.stage} go?
            </legend>
            <div className="flex flex-wrap gap-2">
              {TOLERANCE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selectionMode="single"
                  shape="panel"
                  name="tolerance"
                  value={option.value}
                  label={option.label}
                  detail={option.detail}
                  checked={tolerance === option.value}
                  onChange={() => setTolerance(option.value)}
                />
              ))}
            </div>
          </fieldset>

          <div className="mt-5 flex flex-wrap gap-3">
            {check.allowed ? (
              <Button size="lg" onClick={() => onChange(advance(state))}>
                Move up to stage {state.stage + 1}
              </Button>
            ) : null}

            <Button
              size="lg"
              variant="secondary"
              onClick={() => onChange(regress(state))}
              disabled={state.stage === 1}
            >
              Today was harder — go back a stage
            </Button>
          </div>

          {check.allowed ? null : (
            <p role="status" className="mt-3 max-w-prose text-sm text-text-muted">
              {check.reason}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3 border-t border-border pt-5">
        <label className="flex max-w-prose items-start gap-3 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={state.atBaseline}
            onChange={(event) => onChange({ ...state, atBaseline: event.target.checked })}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-border-strong text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <span>
            My symptoms are back to how they were before the injury.
            {state.track === 'sport' ? ' Required from stage 4 onwards.' : ''}
          </span>
        </label>

        {state.track === 'sport' ? (
          <label className="flex max-w-prose items-start gap-3 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={state.clinicianCleared}
              onChange={(event) => onChange({ ...state, clinicianCleared: event.target.checked })}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-border-strong text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            <span>
              A clinician has assessed me and cleared me for contact. Mindful is recording what they
              said — it is not deciding it, and ticking this without an appointment only fools you.
            </span>
          </label>
        ) : null}
      </div>

      <p className="mt-5 text-sm text-text-subtle">
        Every stage takes at least {MIN_STAGE_HOURS} hours. A small, brief increase in symptoms
        during a stage is expected; anything more means the stage was too much.
      </p>

      <div className="mt-4">
        <Button variant="ghost" size="md" onClick={onStop}>
          Stop tracking this plan
        </Button>
      </div>
    </Card>
  )
}

export default ProtocolTracker
