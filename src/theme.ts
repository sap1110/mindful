/**
 * Mindful design tokens.
 *
 * The single source of truth for anything a component needs in TypeScript
 * (framer-motion values, inline SVG fills, canvas colours). Tailwind classes
 * remain the preferred way to style markup — reach for this file only when a
 * value has to cross into JS.
 *
 * Kept in sync by hand with `tailwind.config.js` and the CSS variables in
 * `src/index.css`. Changing a colour means changing all three.
 */

/* ---------------------------------------------------------------- palette */

export const palette = {
  /** Warm paper neutrals — the base of every surface. */
  cream: {
    50: '#FDFCFA',
    100: '#FAF7F2',
    200: '#F3EFE7',
    300: '#E8E2D6',
    400: '#D6CDBC',
    500: '#B9AE99',
    600: '#948976',
    700: '#6F6757',
    800: '#4A443B',
    900: '#2A2621',
  },
  /** Grounded sage — the primary voice. Steady, not sleepy. */
  sage: {
    50: '#F2F6F3',
    100: '#E3EDE7',
    200: '#C6DACE',
    300: '#A2C0B0',
    400: '#78A18C',
    500: '#56836E',
    600: '#416757',
    700: '#345346',
    800: '#2A4239',
    900: '#1E2F29',
  },
  /** Cool mist — focus rings, quiet informational moments. */
  mist: {
    50: '#F0F5F7',
    100: '#DFEBEF',
    200: '#BFD7DF',
    300: '#97BCC9',
    400: '#6C9CAE',
    500: '#4E7F92',
    600: '#3D6675',
    700: '#33525E',
    800: '#2B424C',
    900: '#1F2F36',
  },
  /** Soft lavender — reflective, night-time, journaling. */
  lavender: {
    50: '#F5F3F9',
    100: '#EBE7F2',
    200: '#D8D0E7',
    300: '#BDB0D5',
    400: '#9E8CBE',
    500: '#8271A5',
    600: '#695B87',
    700: '#564A6D',
    800: '#473E59',
    900: '#322C3D',
  },
  /** Warm clay — the single accent. One accented thing per screen, at most. */
  clay: {
    50: '#FBF4F0',
    100: '#F7E8E0',
    200: '#EFD0C0',
    300: '#E1B098',
    400: '#CE8B6C',
    500: '#B96C4B',
    600: '#9A553A',
    700: '#7D4530',
    800: '#65392A',
    900: '#452821',
  },
  ink: '#1B211E',
} as const

/* -------------------------------------------------------------- semantics */

/**
 * Semantic tokens. Every value here is contrast-checked against the surface it
 * is intended to sit on; the ratio is noted where it matters for WCAG AA.
 */
export const colors = {
  background: palette.cream[100],
  surface: '#FFFDFA',
  surfaceMuted: palette.cream[200],
  surfaceSunken: palette.cream[300],

  primary: palette.sage[700], // 8.4:1 on background
  primaryHover: palette.sage[800],
  primarySoft: palette.sage[100],
  primaryFg: palette.cream[50],

  accent: palette.clay[600],
  accentHover: palette.clay[700],
  accentSoft: palette.clay[100],
  accentFg: palette.cream[50],

  text: palette.ink, // 15.5:1 on background
  textMuted: '#5F6A63', // 5.3:1
  textSubtle: '#667169', // 4.8:1
  textInverse: palette.cream[50],

  border: '#E4DDD0',
  borderStrong: '#D2C9B8',

  success: '#3D7A5D', // 5.1:1 against white text
  successSoft: '#E2F0E7',
  successFg: palette.cream[50],

  ring: palette.mist[500], // 4.1:1 on background (non-text AA)
} as const

/* ------------------------------------------------------------- typography */

export const typography = {
  fonts: {
    display: "Fraunces, 'Iowan Old Style', Georgia, ui-serif, serif",
    sans: "'DM Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  /** rem sizes; the paired line heights live in tailwind.config.js. */
  scale: {
    '2xs': '0.6875rem',
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.0625rem',
    xl: '1.1875rem',
    '2xl': '1.375rem',
    '3xl': '1.625rem',
    displayXs: '1.75rem',
    displaySm: '2.125rem',
    displayMd: '2.75rem',
    displayLg: '3.5rem',
    displayXl: '4.25rem',
  },
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const

/* ---------------------------------------------------- spacing & structure */

/** 4px base scale. Layout gaps should come from here, not from ad-hoc values. */
export const spacing = {
  0: '0rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
} as const

export const radii = {
  xs: '0.375rem',
  sm: '0.5rem',
  base: '0.75rem',
  md: '0.875rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  '4xl': '2.5rem',
  '5xl': '3rem',
  pill: '9999px',
} as const

export const shadows = {
  soft: '0 1px 2px rgba(42, 38, 33, 0.04), 0 4px 16px -6px rgba(42, 38, 33, 0.07)',
  lift: '0 2px 4px rgba(42, 38, 33, 0.04), 0 14px 36px -12px rgba(42, 38, 33, 0.13)',
  float: '0 10px 56px -16px rgba(42, 38, 33, 0.20)',
} as const

/* ----------------------------------------------------------------- motion */

/**
 * Motion vocabulary. Mindful animates slowly and only on entry — nothing
 * bounces, nothing demands attention. Durations are seconds (framer-motion).
 */
export const motionTokens = {
  ease: {
    calm: [0.22, 1, 0.36, 1],
    gentle: [0.4, 0, 0.2, 1],
    settle: [0.34, 1.26, 0.64, 1],
  },
  duration: { quick: 0.16, base: 0.26, slow: 0.48, ambient: 0.9 },
  /** Delay between siblings in a staggered list. */
  stagger: 0.055,
} as const

export const theme = {
  palette,
  colors,
  typography,
  spacing,
  radii,
  shadows,
  motion: motionTokens,
} as const

export type Theme = typeof theme
export default theme
