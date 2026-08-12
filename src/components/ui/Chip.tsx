import { Check } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface ChipProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  /** `multi` renders a checkbox, `single` a radio — real inputs, always. */
  selectionMode: 'multi' | 'single'
  label: ReactNode
  /** Second line, e.g. the rhythm under a breathing pattern's name. */
  detail?: ReactNode
  /** `pill` is a tag; `panel` is a wider segmented option. */
  shape?: 'pill' | 'panel'
}

/**
 * The small selectable pill: mood tags, breathing patterns, session lengths.
 *
 * Same construction as `ChoiceTile`, one size down — a visually hidden real
 * input drives every visual state through `peer-*`, so keyboard behaviour
 * (arrow keys within a radio group, space to toggle a checkbox) and screen
 * reader semantics come from the platform rather than from us.
 *
 * Selection is never signalled by colour alone: a checked chip also gains a
 * tick, a heavier weight and a ring.
 */
export function Chip({
  selectionMode,
  label,
  detail,
  shape = 'pill',
  className,
  ...rest
}: ChipProps) {
  const isMulti = selectionMode === 'multi'

  return (
    <label className={cn('group relative block cursor-pointer', className)}>
      <input type={isMulti ? 'checkbox' : 'radio'} className="peer sr-only" {...rest} />

      <span
        className={cn(
          'flex h-full select-none items-center justify-center gap-1.5 border text-center',
          'border-border bg-surface text-text-muted shadow-soft',
          'transition-[background-color,border-color,color,box-shadow] duration-250 ease-calm',
          'group-hover:border-border-strong group-hover:text-text',
          'peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:font-semibold peer-checked:text-primary-hover',
          'peer-checked:shadow-[inset_0_0_0_1px_rgb(var(--c-primary))]',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
          'peer-disabled:opacity-45',
          'peer-checked:[&_.chip-check]:opacity-100 peer-checked:[&_.chip-check]:w-3.5',
          // Nested, so it needs a descendant variant rather than a sibling one.
          'peer-checked:[&_.chip-detail]:text-primary',
          shape === 'pill'
            ? 'min-h-11 rounded-pill px-3.5 py-2 text-sm'
            : 'min-h-16 flex-col gap-0.5 rounded-2xl px-3 py-2.5 text-[0.9375rem] leading-snug',
        )}
      >
        <Check
          aria-hidden="true"
          className="chip-check h-3.5 w-0 shrink-0 opacity-0 transition-[opacity,width] duration-250"
        />
        <span className="flex flex-col items-center">
          <span>{label}</span>
          {detail ? (
            <span className="chip-detail text-xs font-normal text-text-subtle">{detail}</span>
          ) : null}
        </span>
      </span>
    </label>
  )
}

export default Chip
