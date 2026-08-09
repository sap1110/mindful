import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** Always required — Mindful has no placeholder-only inputs. */
  label: ReactNode
  /** Supporting copy shown under the label and wired up via aria-describedby. */
  hint?: ReactNode
  /** Error message. Announced politely; also sets aria-invalid. */
  error?: string
  /** Live character count, e.g. for the name field. */
  counter?: ReactNode
}

/**
 * A labelled text input. The label is a real `<label>` bound by id, hints and
 * errors are linked with `aria-describedby`, and the error region is a live
 * region so a screen reader hears validation without losing focus.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, counter, className, required, ...rest },
  ref,
) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
          {required ? (
            <span className="ml-1 text-accent" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {counter ? (
          <span className="text-xs tabular-nums text-text-subtle" aria-hidden="true">
            {counter}
          </span>
        ) : null}
      </div>

      {hint ? (
        <p id={hintId} className="mb-2.5 text-sm text-text-muted">
          {hint}
        </p>
      ) : null}

      <input
        ref={ref}
        id={id}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full rounded-2xl border bg-surface px-4.5 py-3.5 text-lg text-text',
          'shadow-inset transition-[border-color,box-shadow] duration-250 ease-calm',
          'placeholder:text-text-subtle',
          'hover:border-border-strong',
          'focus:outline-none focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_rgb(var(--c-ring)/0.22)]',
          'focus-visible:outline-none',
          error ? 'border-accent' : 'border-border',
          className,
        )}
        {...rest}
      />

      <div aria-live="polite" className="min-h-[1.375rem]">
        {error ? (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-accent-hover">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
})

export default TextField
