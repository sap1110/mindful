import { cn } from '../../lib/cn'
import type { ScreenerAnswer, ScreenerOption, ScreenerQuestion } from '../../lib/screener'
import { Chip } from '../ui/Chip'

export interface ScreenerItemProps {
  question: ScreenerQuestion
  options: readonly ScreenerOption[]
  /** 1-based, shown so a long form stays navigable. */
  position: number
  total: number
  value: ScreenerAnswer | undefined
  onChange: (value: ScreenerAnswer) => void
  /** Set once an incomplete form has been submitted, never before. */
  isMissing?: boolean
  className?: string
}

/**
 * One item and its four frequency options.
 *
 * A real `<fieldset>` whose `<legend>` is the question itself, so the question
 * is announced once with the group and the options read as "Several days" rather
 * than as four orphaned words. Arrow-key movement between options comes from the
 * radio group, not from us.
 *
 * Note what is deliberately absent: the risk item (PHQ-9 item 9) gets no warning
 * badge, no colour, no special framing. Signposting it would tell the person
 * which answer is the alarming one *before* they answer, and a screening
 * instrument only works if the items are read evenly. It is handled on the way
 * out, in the result, not on the way in.
 */
export function ScreenerItem({
  question,
  options,
  position,
  total,
  value,
  onChange,
  isMissing = false,
  className,
}: ScreenerItemProps) {
  const hintId = `${question.id}-position`

  return (
    <fieldset
      className={cn(
        'min-w-0 rounded-3xl border p-5 transition-colors duration-250 ease-calm sm:p-6',
        isMissing ? 'border-accent/60 bg-accent-soft/35' : 'border-border bg-surface shadow-soft',
        className,
      )}
    >
      <legend className="float-none mb-4 w-full p-0">
        <span
          id={hintId}
          className="block text-2xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
        >
          Question {position} of {total}
        </span>
        <span className="mt-1.5 block max-w-prose text-[1.0625rem] leading-snug text-text">
          {question.text}
        </span>
        {isMissing ? (
          <span className="mt-2 block text-sm font-medium text-accent-hover">
            Still to answer.
          </span>
        ) : null}
      </legend>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => (
          <Chip
            key={option.value}
            shape="panel"
            selectionMode="single"
            name={question.id}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            label={option.label}
          />
        ))}
      </div>
    </fieldset>
  )
}

export default ScreenerItem
