import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { MOOD_LEVELS } from '../../lib/mood'

/**
 * The check-in, playable before you sign up.
 *
 * A landing page that only *describes* a mood scale is asking people to
 * imagine the thing instead of showing it. This is the real scale, with the
 * real faces and words, responding the way the real one does — and storing
 * absolutely nothing. Hovering or focusing a face reveals its label and gloss;
 * choosing one is a demonstration that resets when you leave.
 *
 * It is a `radiogroup` of real inputs rather than a row of divs, so the
 * keyboard behaviour people expect from a rating scale — arrow keys within the
 * group, one tab stop for the whole thing — comes from the platform. The face
 * is never the only cue: every option carries its word, and the word is what a
 * screen reader announces.
 */
export function MoodPreview({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()
  const [chosen, setChosen] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  const showing = hovered ?? chosen
  const level = MOOD_LEVELS.find((entry) => entry.score === showing) ?? null

  return (
    <div
      className={cn(
        'rounded-3xl border border-border bg-surface/85 p-5 shadow-soft backdrop-blur sm:p-6',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
        Try it — nothing is saved
      </p>

      <p className="mt-2 font-display text-xl text-text">How is today, so far?</p>

      <div
        role="radiogroup"
        aria-label="Try the daily check-in scale. Nothing is saved."
        className="mt-4 flex flex-wrap gap-2"
        onMouseLeave={() => setHovered(null)}
      >
        {MOOD_LEVELS.map((entry) => {
          const isChosen = chosen === entry.score
          return (
            <label
              key={entry.id}
              className="group relative cursor-pointer"
              onMouseEnter={() => setHovered(entry.score)}
            >
              <input
                type="radio"
                name="mood-preview"
                value={entry.score}
                checked={isChosen}
                onChange={() => setChosen(entry.score)}
                onFocus={() => setHovered(entry.score)}
                onBlur={() => setHovered(null)}
                className="peer sr-only"
              />
              <motion.span
                aria-hidden="true"
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { scale: isChosen ? 1.06 : hovered === entry.score ? 1.03 : 1 }
                }
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl border text-xl',
                  'border-border bg-surface shadow-soft',
                  'transition-[background-color,border-color,box-shadow] duration-400 ease-calm',
                  'group-hover:border-border-strong',
                  'peer-checked:border-primary peer-checked:shadow-[inset_0_0_0_1px_rgb(var(--c-primary))]',
                  'peer-focus-visible:outline peer-focus-visible:outline-2',
                  'peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                  isChosen && entry.tintClass,
                )}
              >
                {entry.face}
              </motion.span>
              <span className="sr-only">
                {entry.label} — {entry.hint}
              </span>
            </label>
          )
        })}
      </div>

      {/*
        Fixed height, so revealing the label does not shove the page down —
        a layout that jumps under the cursor is the opposite of calm.
      */}
      <p className="mt-3.5 min-h-[2.75rem] text-sm text-text-muted" aria-live="polite">
        {level ? (
          <>
            <span className="font-medium text-text">{level.label}.</span> {level.hint}.{' '}
            {chosen === level.score ? 'In the real thing, that is the whole check-in.' : ''}
          </>
        ) : (
          'Five faces, one tap. Tags and a note if you want them, and never a streak to keep.'
        )}
      </p>
    </div>
  )
}

export default MoodPreview
