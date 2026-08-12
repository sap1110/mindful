import type { Transition, Variants } from 'framer-motion'
import { motionTokens } from '../theme'

/**
 * Shared motion vocabulary.
 *
 * The rule for Mindful: movement should feel like breathing out. Short travel
 * distances, long easing tails, nothing that overshoots or bounces. Screens
 * cross-fade with a small directional hint so the flow reads as forward motion
 * without ever feeling like a carousel.
 */

const { ease, duration, stagger } = motionTokens

export const transitions = {
  calm: { duration: duration.slow, ease: ease.calm } satisfies Transition,
  gentle: { duration: duration.base, ease: ease.gentle } satisfies Transition,
  quick: { duration: duration.quick, ease: ease.gentle } satisfies Transition,
  ambient: { duration: duration.ambient, ease: ease.calm } satisfies Transition,
} as const

/** Fade + rise. The default entrance for anything that appears on its own. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: transitions.calm },
  exit: { opacity: 0, y: -8, transition: transitions.gentle },
}

/** Parent wrapper that walks its children in, one after another. */
export const staggerParent: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: 0.08 },
  },
  exit: {
    transition: { staggerChildren: 0.02, staggerDirection: -1 },
  },
}

/** Child of `staggerParent`. Slightly shorter travel than a lone `fadeUp`. */
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: transitions.calm },
  exit: { opacity: 0, y: -6, transition: transitions.quick },
}

/** Soft scale-in for a single hero element (the mark, the completion tick). */
export const bloom: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: transitions.ambient },
  exit: { opacity: 0, scale: 0.98, transition: transitions.gentle },
}

/**
 * Onboarding step transitions. `custom` carries the direction: 1 when moving
 * forward through the flow, -1 when stepping back.
 */
export const stepVariants: Variants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 28 : -28,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.slow, ease: ease.calm },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -24 : 24,
    transition: { duration: duration.base, ease: ease.gentle },
  }),
}

/** Whole-page entrance used by each route. */
export const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.slow, ease: ease.gentle } },
  exit: { opacity: 0, transition: { duration: duration.quick, ease: ease.gentle } },
}
