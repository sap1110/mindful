import { cn } from '../../lib/cn'
import { describeDay } from '../../lib/date'
import { bandForScore, getScreener, maxScore, type BandTone } from '../../lib/screener'
import type { ScreenerResult } from '../../lib/storage'

/** Matches `ScoreScale` — decorative only, always paired with the band's name. */
const TONE_FILL: Record<BandTone, string> = {
  calm: 'bg-sage-300',
  mild: 'bg-cream-400',
  moderate: 'bg-clay-300',
  elevated: 'bg-clay-500',
}

export interface ScreenerHistoryProps {
  results: readonly ScreenerResult[]
  /** Ids seeded by the sample-data toggle, so those rows can say so. */
  sampleIds?: readonly string[]
  className?: string
}

/**
 * Every result so far, newest first, grouped by instrument.
 *
 * Bars are scaled against the instrument's own maximum rather than against the
 * highest score present, so a run of low scores reads as low rather than being
 * stretched to fill the width and looking alarming. Each row states its band in
 * words and its score in numbers; the bar only repeats what they already say.
 */
export function ScreenerHistory({ results, sampleIds = [], className }: ScreenerHistoryProps) {
  if (results.length === 0) return null

  const byScreener = ['phq9', 'gad7'] as const

  return (
    <section aria-labelledby="screener-history-heading" className={className}>
      <h2
        id="screener-history-heading"
        className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
      >
        Your results so far
      </h2>

      <p className="mt-2 max-w-prose text-text-muted">
        Kept on this device only. A single score says less than the direction several of them point
        in.
      </p>

      <div className="mt-5 space-y-8">
        {byScreener.map((screenerId) => {
          const forThis = results.filter((result) => result.screenerId === screenerId)
          if (forThis.length === 0) return null

          const screener = getScreener(screenerId)
          const max = maxScore(screener)

          return (
            <div key={screenerId}>
              <h3 className="font-sans text-sm font-semibold text-text">
                {screener.name}
                <span className="ml-2 font-normal text-text-subtle">
                  {forThis.length === 1 ? '1 result' : `${forThis.length} results`}
                </span>
              </h3>

              <ul className="mt-3 space-y-2.5">
                {forThis.map((result) => {
                  const band = bandForScore(screener, result.score)
                  const isSample = sampleIds.includes(result.id)

                  return (
                    <li
                      key={result.id}
                      className="rounded-2xl border border-border bg-surface p-4 shadow-soft"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="text-[0.9375rem] font-medium text-text">
                          {band.label}
                          <span className="ml-1.5 font-normal text-text-subtle">
                            · {result.score} of {max}
                          </span>
                        </p>
                        <p className="text-xs uppercase tracking-[0.06em] text-text-subtle">
                          {describeDay(result.date)}
                          {isSample ? (
                            <span className="ml-2 rounded-pill bg-surface-muted px-2 py-0.5 text-2xs font-medium normal-case tracking-normal text-text-muted">
                              Sample
                            </span>
                          ) : null}
                        </p>
                      </div>

                      <span
                        aria-hidden="true"
                        className="mt-2.5 block h-1.5 w-full overflow-hidden rounded-pill bg-surface-sunken/70"
                      >
                        <span
                          className={cn('block h-full rounded-pill', TONE_FILL[band.tone])}
                          style={{ width: `${Math.max(3, (result.score / max) * 100)}%` }}
                        />
                      </span>

                      {result.riskFlagged ? (
                        <p className="mt-2.5 text-sm font-medium text-accent-hover">
                          This one included an answer about thoughts of self-harm.
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default ScreenerHistory
