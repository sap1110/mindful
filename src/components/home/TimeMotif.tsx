import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { timeOfDay, type TimeOfDay } from '../../lib/date'

/**
 * A small drawn sky for the top of the home screen.
 *
 * Purely decorative, and deliberately so: it exists to make the screen feel
 * like a place rather than a dashboard, and to quietly acknowledge the hour
 * someone opened the app — 2am and 2pm are different kinds of visit. It says
 * nothing the greeting beside it does not already say in words, which is why
 * it is `aria-hidden` rather than described.
 *
 * Drawn in SVG against the palette tokens instead of shipping an illustration:
 * it stays crisp at any size, weighs nothing, and follows a theme change for
 * free. The drift is the same slow easing as everything else here, and it
 * stops entirely under `prefers-reduced-motion`.
 */
export function TimeMotif({ when = timeOfDay(), className }: { when?: TimeOfDay; className?: string }) {
  const prefersReducedMotion = useReducedMotion()

  // Sun high at midday, low and warm in the evening, gone at night.
  const orb = {
    morning: { cy: 26, r: 9, className: 'fill-clay-200' },
    afternoon: { cy: 20, r: 10, className: 'fill-cream-400' },
    evening: { cy: 34, r: 9, className: 'fill-clay-300' },
    night: { cy: 24, r: 7, className: 'fill-mist-200' },
  }[when]

  const drift = prefersReducedMotion ? undefined : { x: [0, 6, 0], y: [0, -3, 0] }

  return (
    <div aria-hidden="true" className={cn('pointer-events-none select-none', className)}>
      <svg viewBox="0 0 160 64" className="h-16 w-40" role="presentation">
        {/* The orb — sun by day, moon at night. */}
        <motion.circle
          cx={120}
          cy={orb.cy}
          r={orb.r}
          className={orb.className}
          animate={drift}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Night gets a crescent bite taken out of the orb. */}
        {when === 'night' ? (
          <circle cx={116} cy={orb.cy - 3} r={orb.r} className="fill-background" />
        ) : null}

        {/* Two hills, the same sage the rest of the app is built from. */}
        <path d="M0 64 Q 34 40 66 56 Q 92 68 122 50 Q 144 38 160 46 L160 64 Z" className="fill-sage-200/70" />
        <path d="M0 64 Q 40 52 74 62 Q 108 72 160 56 L160 64 Z" className="fill-sage-300/60" />

        {/* Three blades of grass, drifting out of phase with each other. */}
        {[26, 52, 96].map((x, index) => (
          <motion.path
            key={x}
            d={`M${x} 62 Q ${x + 2} 54 ${x + 5} 50`}
            className="stroke-sage-400/70"
            strokeWidth={1.4}
            strokeLinecap="round"
            fill="none"
            animate={prefersReducedMotion ? undefined : { rotate: [0, 3, 0] }}
            style={{ originX: `${x}px`, originY: '62px' }}
            transition={{
              duration: 7 + index * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 1.4,
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export default TimeMotif
