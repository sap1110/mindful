/** @type {import('tailwindcss').Config} */

/**
 * Mindful design system — Tailwind theme.
 *
 * Palette philosophy: a warm paper base (cream), grounded sage as the primary,
 * cool mist + soft lavender as supporting hues, and a single warm clay accent.
 * Everything is low-saturation and high-legibility.
 *
 * Semantic tokens resolve to CSS variables declared in src/index.css, so a
 * future theme (dark / high-contrast) is a variable swap, not a refactor.
 */

/** Resolve a semantic token from a CSS variable while keeping opacity modifiers working. */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ---- Raw palette ---- */
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

        /* ---- Semantic tokens ---- */
        background: token('--c-background'),
        surface: {
          DEFAULT: token('--c-surface'),
          muted: token('--c-surface-muted'),
          sunken: token('--c-surface-sunken'),
        },
        primary: {
          DEFAULT: token('--c-primary'),
          hover: token('--c-primary-hover'),
          soft: token('--c-primary-soft'),
          fg: token('--c-primary-fg'),
        },
        accent: {
          DEFAULT: token('--c-accent'),
          hover: token('--c-accent-hover'),
          soft: token('--c-accent-soft'),
          fg: token('--c-accent-fg'),
        },
        text: {
          DEFAULT: token('--c-text'),
          muted: token('--c-text-muted'),
          subtle: token('--c-text-subtle'),
          inverse: token('--c-text-inverse'),
        },
        muted: token('--c-text-muted'),
        border: {
          DEFAULT: token('--c-border'),
          strong: token('--c-border-strong'),
        },
        success: {
          DEFAULT: token('--c-success'),
          soft: token('--c-success-soft'),
          fg: token('--c-success-fg'),
        },
        ring: token('--c-ring'),
      },

      fontFamily: {
        display: ['Fraunces', 'Iowan Old Style', 'Georgia', 'ui-serif', 'serif'],
        sans: [
          '"DM Sans"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },

      /* Type scale — tight, calm leading on display; generous leading on body. */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.4rem' }],
        base: ['1rem', { lineHeight: '1.65rem' }],
        lg: ['1.0625rem', { lineHeight: '1.75rem' }],
        xl: ['1.1875rem', { lineHeight: '1.85rem' }],
        '2xl': ['1.375rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        '3xl': ['1.625rem', { lineHeight: '2.15rem', letterSpacing: '-0.012em' }],
        'display-xs': ['1.75rem', { lineHeight: '2.1rem', letterSpacing: '-0.015em' }],
        'display-sm': ['2.125rem', { lineHeight: '2.5rem', letterSpacing: '-0.018em' }],
        'display-md': ['2.75rem', { lineHeight: '3.05rem', letterSpacing: '-0.021em' }],
        'display-lg': ['3.5rem', { lineHeight: '3.75rem', letterSpacing: '-0.024em' }],
        'display-xl': ['4.25rem', { lineHeight: '4.4rem', letterSpacing: '-0.028em' }],
      },

      /* 4px base, plus the half-steps and large rhythm stops the layouts need. */
      spacing: {
        0.5: '0.125rem',
        1.5: '0.375rem',
        2.5: '0.625rem',
        3.5: '0.875rem',
        4.5: '1.125rem',
        5.5: '1.375rem',
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
        30: '7.5rem',
        34: '8.5rem',
        112: '28rem',
        128: '32rem',
        144: '36rem',
      },

      /* Soft, friendly radii — nothing sharper than 6px anywhere in the UI. */
      borderRadius: {
        xs: '0.375rem',
        sm: '0.5rem',
        DEFAULT: '0.75rem',
        md: '0.875rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
        '5xl': '3rem',
        pill: '9999px',
      },

      boxShadow: {
        soft: '0 1px 2px rgba(42, 38, 33, 0.04), 0 4px 16px -6px rgba(42, 38, 33, 0.07)',
        lift: '0 2px 4px rgba(42, 38, 33, 0.04), 0 14px 36px -12px rgba(42, 38, 33, 0.13)',
        float: '0 10px 56px -16px rgba(42, 38, 33, 0.20)',
        inset: 'inset 0 1px 2px rgba(42, 38, 33, 0.05)',
        none: 'none',
      },

      transitionTimingFunction: {
        calm: 'cubic-bezier(0.22, 1, 0.36, 1)',
        gentle: 'cubic-bezier(0.4, 0, 0.2, 1)',
        settle: 'cubic-bezier(0.34, 1.26, 0.64, 1)',
      },

      transitionDuration: {
        250: '250ms',
        400: '400ms',
        600: '600ms',
        900: '900ms',
      },

      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.09)', opacity: '0.85' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(2%, -3%, 0) scale(1.04)' },
          '66%': { transform: 'translate3d(-2%, 2%, 0) scale(0.97)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 12px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },

      animation: {
        breathe: 'breathe 9s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        drift: 'drift 26s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
      },

      maxWidth: {
        prose: '68ch',
        measure: '34rem',
      },
    },
  },
  plugins: [],
}
