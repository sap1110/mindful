import { cn } from '../../lib/cn'
import { describeDay, formatShortDay, formatWeekday, lastDays } from '../../lib/date'
import { moodBarHeight, moodLevel, moodTagLabel } from '../../lib/mood'
import type { MoodEntry } from '../../lib/storage'

const WINDOW_DAYS = 30

export interface MoodHistoryProps {
  entries: readonly MoodEntry[]
  /** Ids seeded by the sample-data toggle, so those rows can say so. */
  sampleIds?: readonly string[]
  className?: string
}

/**
 * The last thirty days, twice: a strip you can take in at a glance, and a list
 * you can actually read.
 *
 * The strip never relies on colour. Each day is a bar whose *height* carries
 * the score, each bar is a list item with its own text label, and a missing
 * day is drawn as an empty track labelled "no check-in" rather than as a gap
 * to feel bad about.
 */
export function MoodHistory({ entries, sampleIds = [], className }: MoodHistoryProps) {
  const days = lastDays(WINDOW_DAYS)
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const logged = days.filter((day) => byDate.has(day))
  const recent = [...entries]
    .filter((entry) => days.includes(entry.date))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section aria-labelledby="mood-history-heading" className={className}>
      <h2
        id="mood-history-heading"
        className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
      >
        The last 30 days
      </h2>

      {logged.length === 0 ? (
        <p className="mt-3 max-w-prose text-text-muted">
          Nothing here yet. Your check-ins will collect quietly on this page — there is no streak to
          keep and no day that counts as missed.
        </p>
      ) : (
        <>
          <p className="mt-2 text-text-muted">
            {logged.length === 1
              ? 'One check-in so far.'
              : `${logged.length} check-ins in the last 30 days.`}
          </p>

          <ul
            aria-label="Mood for each of the last 30 days, oldest first"
            className="mt-4 flex h-24 items-end gap-[3px] rounded-2xl border border-border bg-surface/70 p-3 shadow-soft"
          >
            {days.map((day) => {
              const entry = byDate.get(day)
              const level = entry ? moodLevel(entry.score) : null

              return (
                <li key={day} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <span
                    aria-hidden="true"
                    className="relative flex h-full w-full items-end rounded-sm bg-surface-sunken/60"
                  >
                    {entry && level ? (
                      <span
                        className={cn('w-full rounded-sm', level.barClass)}
                        style={{ height: moodBarHeight(entry.score) }}
                      />
                    ) : (
                      <span className="h-[3px] w-full rounded-sm bg-border-strong" />
                    )}
                  </span>
                  <span className="sr-only">
                    {formatShortDay(day)}:{' '}
                    {entry && level ? `${level.label}, ${entry.score} out of 5` : 'no check-in'}
                  </span>
                </li>
              )
            })}
          </ul>

          <div
            aria-hidden="true"
            className="mt-1.5 flex justify-between px-1 text-2xs text-text-subtle"
          >
            <span>{formatShortDay(days[0])}</span>
            <span className="hidden sm:inline">{formatShortDay(days[Math.floor(WINDOW_DAYS / 2)])}</span>
            <span>{formatWeekday(days[WINDOW_DAYS - 1])} · today</span>
          </div>

          <h3 className="mt-8 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
            Each check-in
          </h3>
          <ul className="mt-3 space-y-2.5">
            {recent.map((entry) => {
              const level = moodLevel(entry.score)
              const isSample = sampleIds.includes(entry.id)

              return (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-[0.9375rem] font-medium text-text">
                      <span aria-hidden="true" className="mr-1.5">
                        {level.face}
                      </span>
                      {level.label}
                      <span className="ml-1.5 font-normal text-text-subtle">
                        · {entry.score} of 5
                      </span>
                    </p>
                    <p className="text-xs uppercase tracking-[0.06em] text-text-subtle">
                      {describeDay(entry.date)}
                      {isSample ? (
                        <span className="ml-2 rounded-pill bg-surface-muted px-2 py-0.5 text-2xs font-medium normal-case tracking-normal text-text-muted">
                          Sample
                        </span>
                      ) : null}
                    </p>
                  </div>

                  {entry.tags.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {entry.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-pill bg-surface-muted px-2.5 py-0.5 text-xs text-text-muted"
                        >
                          {moodTagLabel(tag)}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {entry.note ? (
                    <p className="mt-2 max-w-prose text-sm text-text-muted">{entry.note}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

export default MoodHistory
