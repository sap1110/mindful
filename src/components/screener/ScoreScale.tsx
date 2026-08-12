import { cn } from '../../lib/cn'
import type { BandTone, ScoreBand, Screener } from '../../lib/screener'

/** Fills for the band track. Decorative — every band is also named in text. */
const TONE_FILL: Record<BandTone, string> = {
  calm: 'bg-sage-300',
  mild: 'bg-cream-400',
  moderate: 'bg-clay-300',
  elevated: 'bg-clay-500',
}

export interface ScoreScaleProps {
  screener: Screener
  score: number
  band: ScoreBand
  className?: string
}

/**
 * Where this score sits across the instrument's full range.
 *
 * One segment per band, each sized to the share of the range it covers, with a
 * marker on the score itself. The whole track is a single `role="img"` with a
 * sentence for its label: read aloud, "17 out of 27, in the moderately severe
 * range" is the entire content, and stepping through eight decorative segments
 * would only get in the way of hearing it.
 *
 * Colour is never the message. The band is named in the label above the track,
 * the marker carries the number, and each segment is captioned with its own
 * range underneath.
 */
export function ScoreScale({ screener, score, band, className }: ScoreScaleProps) {
  const max = screener.questions.length * 3
  const span = max + 1
  const markerLeft = `${(score / max) * 100}%`

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`${score} out of ${max}, in the ${band.label.toLowerCase()} range.`}
        className="relative"
      >
        {/* Marker sits above the track so it is never clipped by the segments. */}
        <div className="relative h-7">
          <span
            aria-hidden="true"
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-pill bg-text px-2 py-0.5 text-2xs font-semibold tracking-normal text-text-inverse"
            style={{ left: markerLeft }}
          >
            {score}
          </span>
        </div>

        <div aria-hidden="true" className="relative flex h-3 gap-0.5 overflow-hidden rounded-pill">
          {screener.bands.map((candidate) => {
            const width = ((candidate.max - candidate.min + 1) / span) * 100
            const isCurrent = candidate.id === band.id

            return (
              <span
                key={candidate.id}
                style={{ width: `${width}%` }}
                className={cn(
                  'h-full rounded-pill transition-opacity duration-400 ease-calm',
                  TONE_FILL[candidate.tone],
                  isCurrent ? 'opacity-100' : 'opacity-30',
                )}
              />
            )
          })}
        </div>

        {/* A tick under the track pins the marker to a position, not just a colour. */}
        <div aria-hidden="true" className="relative h-2">
          <span
            className="absolute top-0 h-2 w-0.5 -translate-x-1/2 rounded-pill bg-text"
            style={{ left: markerLeft }}
          />
        </div>
      </div>

      <ul
        aria-hidden="true"
        className="mt-1.5 flex gap-0.5 text-[0.625rem] leading-tight text-text-subtle"
      >
        {screener.bands.map((candidate) => (
          <li
            key={candidate.id}
            style={{ width: `${((candidate.max - candidate.min + 1) / span) * 100}%` }}
            className={cn(
              'min-w-0 text-center',
              candidate.id === band.id && 'font-semibold text-text-muted',
            )}
          >
            <span className="block truncate">{candidate.label}</span>
            <span className="block">
              {candidate.min}–{candidate.max}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ScoreScale
