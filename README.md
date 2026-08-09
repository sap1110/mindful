# Mindful

A calm, private mental-health companion. Built for the Hack for Humanity
hackathon, aimed at the **Best Design** track.

> **Mindful is not medical advice.** It offers reflective self-care prompts and
> does not diagnose, treat, or replace care from a qualified professional. The
> disclaimer is rendered on every screen, not buried in a footer.

## Status — Phase 1 complete

Phase 1 locks the visual identity and ships the lightweight, on-device auth +
onboarding flow:

- A calming design system (palette, type pairing, spacing, radii, motion).
- A landing screen that sets the tone, with a live 4-2-6 breathing element.
- Three-step onboarding — name → what brings you here → coping style — with
  framer-motion screen transitions and a completion state.
- An on-device "auth gate": a completed profile in `localStorage` is what
  "signed in" means. No backend, no account, no analytics.

## Stack

| Concern    | Choice                                     |
| ---------- | ------------------------------------------ |
| Build tool | Vite 6                                     |
| UI         | React 18 + TypeScript 5.6                  |
| Styling    | Tailwind CSS v3 (via PostCSS)              |
| Motion     | framer-motion 13                           |
| Routing    | react-router-dom 7                         |
| Icons      | lucide-react                               |
| Linting    | ESLint 9 (flat config) + typescript-eslint |
| Smoke test | Playwright + axe-core                      |

## Getting started

Requires Node.js 18+ (20+ recommended).

```bash
npm install
npm run dev
```

## Scripts

| Command           | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR                        |
| `npm run build`   | Type-check (`tsc -b`) and build to `dist/`                |
| `npm run lint`    | Run ESLint over the project                               |
| `npm run verify`  | `lint` + `build` — the pre-push gate                      |
| `npm run preview` | Serve the production build locally                        |
| `npm run smoke`   | Drive the whole flow in Chromium (needs a dev server)     |

`npm run smoke` expects the app on `http://127.0.0.1:5178` (override with
`BASE_URL`). It walks landing → onboarding → completion → home, runs an
axe-core WCAG 2.1 A/AA scan on each view, and writes screenshots to
`.screenshots/`.

```bash
npm run dev -- --port 5178   # terminal 1
npm run smoke                # terminal 2
```

## Design system

The visual identity is the deliverable, so the tokens live in three places that
must stay in step:

| File                 | Role                                                       |
| -------------------- | ---------------------------------------------------------- |
| `src/index.css`      | CSS variables (the source of truth at runtime) + base styles |
| `tailwind.config.js` | Tailwind theme — semantic colours resolve to those variables |
| `src/theme.ts`       | The same tokens in TypeScript, for values that cross into JS |

**Palette.** A warm paper base (`cream`), grounded `sage` as the primary, cool
`mist` and soft `lavender` as supporting hues, and a single warm `clay` accent
— at most one accented element per screen. Semantic tokens: `background`,
`surface`, `primary`, `accent`, `text`, `muted`, `border`, `success`, `ring`.

**Type.** Fraunces (a soft optical serif, `SOFT 30 / WONK 1`) for display,
DM Sans for UI. Serif carries statements; sans carries labels.

**Motion.** Everything should feel like breathing out: short travel, long
easing tails, no overshoot. `prefers-reduced-motion` disables all of it
globally in `index.css`.

## Accessibility

WCAG 2.1 AA is a judging criterion and is verified, not assumed — `npm run
smoke` fails the build on any axe violation across all six views.

- Every colour pair is contrast-checked; ratios are noted next to the tokens.
- One focus treatment app-wide (a mist ring, offset), plus a skip link.
- Choice tiles are real `<input type="checkbox">` / `type="radio"` elements,
  visually hidden but focusable, so roles and checked state come for free.
- Focus moves to the incoming step heading on every onboarding transition.
- Errors are wired with `aria-describedby` / `aria-invalid` inside live regions.

## Project structure

```
src/
├── App.tsx                    # Routes
├── main.tsx                   # Entry: BrowserRouter + ProfileProvider
├── index.css                  # Tokens, base styles, reduced-motion
├── theme.ts                   # Design tokens for TypeScript
├── lib/
│   ├── cn.ts                  # clsx + tailwind-merge (custom scales registered)
│   ├── motion.ts              # Shared framer-motion variants
│   └── profile.ts             # Profile type, on-device storage, onboarding copy
├── context/                   # ProfileProvider + context object
├── hooks/useProfile.ts
├── components/
│   ├── AmbientBackdrop.tsx    # Drifting colour fields behind every page
│   ├── BreathingHalo.tsx      # The landing hero's 4-2-6 breath
│   ├── Disclaimer.tsx         # The mandatory health notice
│   ├── Logo.tsx
│   ├── PageShell.tsx          # Skip link, header, <main>, disclaimer footer
│   ├── RequireProfile.tsx     # The on-device auth gate
│   └── ui/                    # Button, Card, TextField, ChoiceTile, ProgressTrail
└── routes/
    ├── Landing.tsx            # /
    ├── Onboarding.tsx         # /onboarding  (+ onboarding/Step*.tsx)
    ├── Home.tsx               # /home        (gated)
    └── NotFound.tsx
```

## Conventions

- Style with Tailwind utilities. New colours go in `index.css` **and**
  `tailwind.config.js` **and** `theme.ts` — never inline hex.
- Any screen that could read as health guidance renders `<Disclaimer />`;
  `PageShell` does it for you.
- Nothing leaves the device. No network calls, no analytics, no accounts.
- Run `npm run verify` before pushing.
