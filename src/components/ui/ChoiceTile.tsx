import { Check } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface ChoiceTileProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  /** `multi` renders a checkbox, `single` a radio — real inputs, always. */
  selectionMode: 'multi' | 'single'
  label: ReactNode
  description?: ReactNode
}

/**
 * A selectable card backed by a real checkbox/radio.
 *
 * The input is visually hidden but still focusable and still announced, so
 * keyboard users get native roving-radio behaviour and screen readers get the
 * correct role and checked state for free. Every visual state is derived from
 * the input via `peer-*`, including the nested indicator (reached with an
 * arbitrary descendant variant, since it is not itself a sibling of the input).
 */
export function ChoiceTile({
  selectionMode,
  label,
  description,
  className,
  ...rest
}: ChoiceTileProps) {
  const isMulti = selectionMode === 'multi'

  return (
    <label className={cn('group relative block cursor-pointer', className)}>
      <input type={isMulti ? 'checkbox' : 'radio'} className="peer sr-only" {...rest} />

      <span
        className={cn(
          'flex h-full items-start gap-3.5 rounded-2xl border border-border bg-surface p-4.5 text-left',
          'shadow-soft transition-[background-color,border-color,box-shadow] duration-250 ease-calm',
          'group-hover:border-border-strong group-hover:shadow-lift',
          'peer-checked:border-primary peer-checked:bg-primary-soft/70 peer-checked:shadow-lift',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
          'peer-disabled:opacity-50',
          // Indicator fill + tick, driven from the input's checked state.
          'peer-checked:[&_.tile-mark]:border-primary peer-checked:[&_.tile-mark]:bg-primary',
          'peer-checked:[&_.tile-check]:opacity-100',
        )}
      >
        {/* Shape differs by control type so it reads at a glance: square = many, round = one. */}
        <span
          aria-hidden="true"
          className={cn(
            'tile-mark mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center',
            'border-2 border-border-strong transition-colors duration-250 ease-calm',
            'group-hover:border-primary/50',
            isMulti ? 'rounded-sm' : 'rounded-pill',
          )}
        >
          <Check
            aria-hidden="true"
            className="tile-check h-3.5 w-3.5 stroke-[3] text-primary-fg opacity-0 transition-opacity duration-250"
          />
        </span>

        <span className="min-w-0">
          <span className="block text-[0.9375rem] font-medium leading-snug text-text">{label}</span>
          {description ? (
            <span className="mt-1 block text-sm leading-snug text-text-muted">{description}</span>
          ) : null}
        </span>
      </span>
    </label>
  )
}

export default ChoiceTile
