import { ChoiceTile } from '../../components/ui/ChoiceTile'
import { REASON_OPTIONS, type ReasonId } from '../../lib/profile'

export interface StepReasonsProps {
  value: ReasonId[]
  onToggle: (id: ReasonId) => void
}

/**
 * Step 2 — what brings you here. Multi-select, and genuinely optional: nobody
 * should have to categorise themselves to use the app.
 */
export function StepReasons({ value, onToggle }: StepReasonsProps) {
  const selectedCount = value.length

  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">
        What brings you here? Choose as many as you like, or none.
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        {REASON_OPTIONS.map((option) => (
          <ChoiceTile
            key={option.id}
            selectionMode="multi"
            name="reasons"
            value={option.id}
            checked={value.includes(option.id)}
            onChange={() => onToggle(option.id)}
            label={option.label}
            description={option.description}
          />
        ))}
      </div>

      <p aria-live="polite" className="mt-4 text-sm text-text-muted">
        {selectedCount === 0
          ? 'Nothing selected — that is completely fine.'
          : `${selectedCount} selected.`}
      </p>
    </fieldset>
  )
}

export default StepReasons
