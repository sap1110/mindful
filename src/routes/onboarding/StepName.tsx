import { TextField } from '../../components/ui/TextField'
import { NAME_MAX_LENGTH } from '../../lib/profile'

export interface StepNameProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

/** Step 1 — what Mindful should call you. Free text, never a legal name. */
export function StepName({ value, onChange, error }: StepNameProps) {
  return (
    <TextField
      label="What should Mindful call you?"
      hint="A first name, a nickname, or anything else. You can change it later."
      placeholder="e.g. Sam"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      maxLength={NAME_MAX_LENGTH}
      autoComplete="given-name"
      autoCapitalize="words"
      spellCheck={false}
      required
      counter={`${value.length}/${NAME_MAX_LENGTH}`}
    />
  )
}

export default StepName
