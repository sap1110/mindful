# Mindful

A calm, private mental-health companion. Built for the Hack for Humanity
hackathon, aimed at the **Best Design** track.

> **Mindful is not medical advice.** It offers reflective self-care prompts and
> does not diagnose, treat, or replace care from a qualified professional. The
> disclaimer is rendered on every screen, not buried in a footer.

## Status

**Phase 1 — identity and the way in.**

- A calming design system (palette, type pairing, spacing, radii, motion).
- A landing screen that sets the tone, with a live 4-2-6 breathing element.
- Three-step onboarding — name → what brings you here → coping style — with
  framer-motion screen transitions and a completion state.
- An on-device "auth gate": a completed profile in `localStorage` is what
  "signed in" means. No backend, no account, no analytics.

**Phase 2 — the daily practice.**

- A mood check-in with tags and an optional note, one entry a day, editable,
  with 30 days of history described in words rather than by colour alone.
- A journal with a daily prompt and an autosaved draft.
- Guided breathing, including a text guide for `prefers-reduced-motion`.
- Settings: JSON export, a two-step erase, and a labelled sample-data toggle.
- A Playwright + axe suite covering every screen, empty and filled.

**Phase 3 — the clinical core.**

- **PHQ-9** and **GAD-7**, reproduced verbatim and cited, scored on this device
  against the published bands.
- Results framed as a questionnaire and never as a diagnosis, with the band
  label carrying the meaning and the number kept deliberately secondary.
- Trend over time per instrument, plus a nudge to leave a fortnight between
  retakes — both instruments ask about the last two weeks, so anything closer
  together mostly measures the same fortnight.
- **Crisis resources**, always present on the self-check screen rather than
  something you have to score badly to be shown. Any answer above "Not at all"
  on PHQ-9 item 9 puts them *above* the score, because a low total is exactly
  the case a score-first layout would bury.

## Not a diagnosis

The screeners are real instruments and the scoring is faithful to the published
bands, but a score is not a condition. Every result says so, in those words. The
one thing Mindful will not do is tell someone what is wrong with them.

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

| Command           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR                         |
| `npm run build`   | Type-check (`tsc -b`) and build to `dist/`                 |
| `npm run lint`    | Run ESLint over the project                                |
| `npm run test`    | The Playwright + axe suite (starts its own dev server)     |
| `npm run verify`  | `lint` + `build` + `test` — the pre-push gate              |
| `npm run preview` | Serve the production build locally                         |
| `npm run smoke`   | Drive the whole flow in Chromium (needs a dev server)      |

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

WCAG 2.1 A/AA is a judging criterion and is verified, not assumed — `npm run
test` fails the build on any axe violation, on every screen, in both empty and
filled states. 46 tests at the time of writing.

- Every colour pair is contrast-checked; ratios are noted next to the tokens.
  The suite is what caught `text-subtle` sitting at 4.43:1 where the floating
  nav composites over a sunken card.
- One focus treatment app-wide (a mist ring, offset), plus a skip link.
- Choice tiles and screener options are real `<input type="checkbox">` /
  `type="radio"` elements, visually hidden but focusable, so roles, checked
  state and arrow-key movement come from the platform.
- Each screener item is a `<fieldset>` whose `<legend>` is the question, so the
  options read as a group rather than as four orphaned words.
- Focus moves to the incoming heading on every onboarding and self-check stage.
- Errors are wired with `aria-describedby` / `aria-invalid` inside live regions.
- Nothing is signalled by colour alone: score bands are named in words and the
  bars only repeat what the text already says.

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
│   ├── profile.ts             # Profile type, on-device storage, onboarding copy
│   ├── storage.ts             # The localStorage layer: read, write, export, erase
│   ├── screener.ts            # PHQ-9 / GAD-7 items, bands, scoring, cadence
│   ├── crisis.ts              # Helplines and the emergency note
│   ├── mood.ts · breathing.ts · prompts.ts · date.ts
│   └── sampleData.ts          # The labelled, removable demo dataset
├── context/                   # ProfileProvider + context object
├── hooks/                     # useProfile, useMindfulData, useBreathingSession
├── components/
│   ├── AmbientBackdrop.tsx    # Drifting colour fields behind every page
│   ├── BreathingHalo.tsx      # The landing hero's 4-2-6 breath
│   ├── Disclaimer.tsx         # The mandatory health notice
│   ├── AppNav.tsx             # The persistent bottom bar
│   ├── PageShell.tsx          # Skip link, header, <main>, disclaimer footer
│   ├── RequireProfile.tsx     # The on-device auth gate
│   ├── screener/              # ScreenerItem, ScoreScale, ResultPanel, History
│   ├── crisis/                # CrisisResources
│   ├── mood/ · journal/ · breathe/
│   └── ui/                    # Button, Card, Chip, TextField, ChoiceTile, …
└── routes/
    ├── Landing.tsx            # /
    ├── Onboarding.tsx         # /onboarding  (+ onboarding/Step*.tsx)
    ├── Home.tsx               # /home        (gated)
    ├── Mood.tsx               # /mood        (gated)
    ├── SelfCheck.tsx          # /self-check  (gated)
    ├── Journal.tsx            # /journal     (gated)
    ├── Breathe.tsx            # /breathe     (gated)
    ├── Settings.tsx           # /settings    (gated)
    └── NotFound.tsx
```

## Attribution

The two screening instruments are reproduced verbatim and are cited in the app
itself, on the self-check screen:

- **PHQ-9** — Kroenke K, Spitzer RL, Williams JBW. *The PHQ-9: validity of a
  brief depression severity measure.* J Gen Intern Med. 2001;16(9):606–613.
- **GAD-7** — Spitzer RL, Kroenke K, Williams JBW, Löwe B. *A brief measure for
  assessing generalized anxiety disorder: the GAD-7.* Arch Intern Med.
  2006;166(10):1092–1097.

Both were developed by Drs Robert L. Spitzer, Janet B.W. Williams and Kurt
Kroenke with an educational grant from Pfizer Inc. No permission is required to
reproduce, translate, display or distribute them.

Crisis resources link to independent services (Find a Helpline, Befrienders
Worldwide, Crisis Text Line, 988, Samaritans, Lifeline) and are not affiliated
with Mindful.

Typefaces: Fraunces and DM Sans, both SIL Open Font License. Icons: lucide.

## Conventions

- Style with Tailwind utilities. New colours go in `index.css` **and**
  `tailwind.config.js` **and** `theme.ts` — never inline hex.
- Screener item wording, options and band thresholds are not editorial copy.
  Changing them makes the published scoring bands meaningless.
- Any screen that could read as health guidance renders `<Disclaimer />`;
  `PageShell` does it for you.
- Nothing leaves the device. No network calls, no analytics, no accounts.
- Run `npm run verify` before pushing.
