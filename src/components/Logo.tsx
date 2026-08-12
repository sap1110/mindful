import { cn } from '../lib/cn'

export interface LogoProps {
  /** Diameter of the mark in pixels. */
  size?: number
  /** Hide the wordmark and show only the ripple. */
  markOnly?: boolean
  className?: string
}

/**
 * The Mindful mark: concentric ripples with a single warm arc — a breath
 * settling, drawn in one weight. Purely decorative next to the wordmark, so
 * the SVG is hidden from assistive tech and the text carries the name.
 */
export function Logo({ size = 32, markOnly = false, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className="shrink-0"
      >
        <circle
          cx="16"
          cy="16"
          r="13"
          className="stroke-primary/20"
          strokeWidth="1.4"
          fill="none"
        />
        <circle
          cx="16"
          cy="16"
          r="9.5"
          className="stroke-primary/40"
          strokeWidth="1.6"
          fill="none"
        />
        <circle cx="16" cy="16" r="4.2" className="fill-primary" />
        <circle
          cx="16"
          cy="16"
          r="9.5"
          className="stroke-accent"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="15 45"
          transform="rotate(-56 16 16)"
          fill="none"
        />
      </svg>

      {markOnly ? (
        <span className="sr-only">Mindful</span>
      ) : (
        <span className="font-display text-xl font-semibold tracking-[-0.015em] text-text">
          Mindful
        </span>
      )}
    </span>
  )
}

export default Logo
