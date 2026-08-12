import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  /** Always required — Mindful has no placeholder-only inputs. */
  label: ReactNode
  /** Supporting copy shown under the label and wired up via aria-describedby. */
  hint?: ReactNode
  /** Hide the label visually while keeping it for assistive tech. */
  hideLabel?: boolean
  /**
   * Quiet status text under the field, e.g. "Draft saved". Deliberately *not*
   * a live region: autosave fires while you are still typing, and having a
   * screen reader interrupt itself every few seconds to say "draft saved"
   * would be worse than not knowing. Screens announce the explicit save.
   */
  status?: ReactNode
}

/**
 * The multi-line sibling of `TextField`: same label wiring, same focus
 * treatment, same rounded surface. Used for the journal composer and the
 * optional note on a mood check-in.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, hideLabel, status, className, rows = 6, ...rest },
  ref,
) {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className={cn('mb-2 block text-sm font-medium text-text', hideLabel && 'sr-only')}
      >
        {label}
      </label>

      {hint ? (
        <p id={hintId} className={cn('mb-2.5 text-sm text-text-muted', hideLabel && 'sr-only')}>
          {hint}
        </p>
      ) : null}

      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-describedby={hint ? hintId : undefined}
        className={cn(
          'w-full resize-y rounded-2xl border border-border bg-surface px-4.5 py-3.5 text-base leading-relaxed text-text',
          'shadow-inset transition-[border-color,box-shadow] duration-250 ease-calm',
          'placeholder:text-text-subtle',
          'hover:border-border-strong',
          'focus:outline-none focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_rgb(var(--c-ring)/0.22)]',
          'focus-visible:outline-none',
          className,
        )}
        {...rest}
      />

      <div className="min-h-[1.375rem]">
        {status ? <p className="mt-1.5 text-xs text-text-subtle">{status}</p> : null}
      </div>
    </div>
  )
})

export default TextArea
