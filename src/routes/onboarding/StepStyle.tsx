import { ChoiceTile } from '../../components/ui/ChoiceTile'
import { COPING_STYLE_OPTIONS, type CopingStyleId } from '../../lib/profile'

export interface StepStyleProps {
  value: CopingStyleId | null
  onChange: (id: CopingStyleId) => void
  error?: string
}

/** Step 3 — the one coping style Mindful should lead with. Single choice. */
export function StepStyle({ value, onChange, error }: StepStyleProps) {
  const errorId = 'coping-style-error'

  return (
    <fieldset
      className="min-w-0 border-0 p-0"
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="sr-only">
        When things get heavy, what usually helps most? Choose one.
      </legend>

      <div className="grid gap-3">
        {COPING_STYLE_OPTIONS.map((option) => (
          <ChoiceTile
            key={option.id}
            selectionMode="single"
            name="copingStyle"
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
            label={option.label}
            description={option.description}
          />
        ))}
      </div>

      <div aria-live="polite" className="min-h-[1.375rem]">
        {error ? (
          <p id={errorId} className="mt-3 text-sm font-medium text-accent-hover">
            {error}
          </p>
        ) : null}
      </div>
    </fieldset>
  )
}

export default StepStyle
