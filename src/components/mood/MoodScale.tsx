import { cn } from '../../lib/cn'
import { MOOD_LEVELS } from '../../lib/mood'
import type { MoodScore } from '../../lib/storage'

export interface MoodScaleProps {
  value: MoodScore | null
  onChange: (score: MoodScore) => void
  /** The question, rendered as the group's legend. */
  legend: string
  className?: string
}

/**
 * The five-point check-in.
 *
 * A real `<fieldset>` of real radios, one per level. That is what gives us
 * arrow-key movement between the faces, space to select, and a group name
 * announced once — all from the platform, none of it hand-rolled.
 *
 * The face is `aria-hidden` decoration; the word underneath is the content.
 * Nothing here is distinguished by colour alone: the selected level gains a
 * ring, a tint, a heavier label and a visible "Selected" cue for screen
 * readers via the input's own checked state.
 */
export function MoodScale({ value, onChange, legend, className }: MoodScaleProps) {
  return (
    <fieldset className={cn('min-w-0 border-0 p-0', className)}>
      <legend className="mb-3 text-sm font-medium text-text">{legend}</legend>

      <div className="flex items-stretch gap-1.5 sm:gap-2.5">
        {MOOD_LEVELS.map((level) => (
          <label key={level.id} className="group relative min-w-0 flex-1 cursor-pointer">
            <input
              type="radio"
              name="mood-score"
              value={level.score}
              checked={value === level.score}
              onChange={() => onChange(level.score)}
              className="peer sr-only"
            />

            <span
              className={cn(
                'relative flex h-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-border bg-surface',
                'px-1 py-3 text-center shadow-soft sm:px-2 sm:py-4',
                'transition-[background-color,border-color,box-shadow,transform] duration-250 ease-calm',
                'group-hover:border-border-strong group-hover:shadow-lift',
                'peer-checked:border-primary peer-checked:shadow-lift',
                'peer-checked:shadow-[inset_0_0_0_2px_rgb(var(--c-primary))]',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                'peer-checked:[&_.mood-label]:font-semibold peer-checked:[&_.mood-label]:text-primary-hover',
                'peer-checked:[&_.mood-tint]:opacity-100',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mood-tint pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-250',
                  level.tintClass,
                )}
              />
              <span aria-hidden="true" className="relative text-2xl leading-none sm:text-3xl">
                {level.face}
              </span>
              <span className="mood-label relative text-2xs leading-tight text-text-muted sm:text-sm">
                {level.label}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default MoodScale
