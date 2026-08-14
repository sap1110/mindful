import { useState } from 'react'
import {
  CONCUSSION_SYMPTOMS,
  MAX_SYMPTOM_RATING,
  MAX_TOTAL_SEVERITY,
  RATING_ANCHORS,
  scoreSymptoms,
} from '../../lib/concussion/symptoms'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'

export interface SymptomCheckFormProps {
  /** Ratings from an earlier check today, so a retake starts where it left off. */
  initial?: Record<string, number>
  onSave: (answers: Record<string, number>) => void
  onCancel: () => void
}

/**
 * Twenty-two symptoms, each on a seven-point scale.
 *
 * That is a lot of radio buttons for someone with a headache and light
 * sensitivity, which is the whole design problem here. The compromises: every
 * item defaults to 0 so a person with four symptoms touches four rows rather
 * than twenty-two; the scale is a real radio group per symptom, so arrow keys
 * move within a row and tab moves between rows; and the numbers carry their
 * word anchors in the accessible name, because "3" means nothing without
 * "moderate" next to it.
 *
 * The running total is shown but deliberately quiet. It is a number to hand a
 * clinician, not a score to beat, and making it the loudest thing on screen
 * would turn a symptom log into a leaderboard on a bad week.
 */
export function SymptomCheckForm({ initial, onSave, onCancel }: SymptomCheckFormProps) {
  const [answers, setAnswers] = useState<Record<string, number>>(initial ?? {})
  const score = scoreSymptoms(answers)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave(answers)
      }}
    >
      <p className="max-w-prose text-text-muted">
        Rate each one for how you are <strong className="font-medium text-text">today</strong>. Zero
        means not present. Leave anything you do not have at zero.
      </p>

      <ul className="mt-6 space-y-3">
        {CONCUSSION_SYMPTOMS.map((symptom) => {
          const value = answers[symptom.id] ?? 0
          return (
            <li
              key={symptom.id}
              className={cn(
                'rounded-2xl border px-4 py-3 transition-colors duration-250 ease-calm',
                value > 0 ? 'border-primary/40 bg-primary-soft/35' : 'border-border bg-surface',
              )}
            >
              <fieldset>
                <legend className="mb-2 text-base text-text">{symptom.label}</legend>
                <div role="radiogroup" aria-label={symptom.label} className="flex flex-wrap gap-1.5">
                  {RATING_ANCHORS.map((anchor) => (
                    <label
                      key={anchor.value}
                      className="group relative cursor-pointer"
                      title={`${anchor.value} — ${anchor.label}`}
                    >
                      <input
                        type="radio"
                        name={symptom.id}
                        value={anchor.value}
                        checked={value === anchor.value}
                        onChange={() =>
                          setAnswers((current) => ({ ...current, [symptom.id]: anchor.value }))
                        }
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-xl border text-base tabular-nums',
                          'border-border bg-surface text-text-muted transition-colors duration-250 ease-calm',
                          'group-hover:border-border-strong group-hover:text-text',
                          'peer-checked:border-primary peer-checked:bg-primary peer-checked:font-semibold',
                          'peer-checked:text-primary-fg',
                          'peer-focus-visible:outline peer-focus-visible:outline-2',
                          'peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                        )}
                      >
                        {anchor.value}
                        <span className="sr-only">
                          {' '}
                          out of {MAX_SYMPTOM_RATING} — {anchor.label}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          )
        })}
      </ul>

      <p className="mt-6 text-sm text-text-muted" aria-live="polite">
        {score.count} {score.count === 1 ? 'symptom' : 'symptoms'} rated · total {score.severity} of{' '}
        {MAX_TOTAL_SEVERITY}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit" size="lg">
          Save today&rsquo;s check
        </Button>
        <Button type="button" size="lg" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default SymptomCheckForm
