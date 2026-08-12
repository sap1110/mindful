# Mindful

A calm, private mental-health companion that runs entirely in the browser.
No backend, no account, no analytics, no network calls — including for the AI.

Built solo for **Hack for Humanity, Summer 2026**.

> **Mindful is not medical advice.** It offers reflective self-care prompts and
> validated screening questionnaires. It does not diagnose, treat, or replace
> care from a qualified professional. The disclaimer renders on every screen,
> not buried in a footer.

---

## Contents

- [What it does](#what-it-does)
- [The privacy model](#the-privacy-model)
- [How the AI works](#how-the-ai-works)
- [Not a diagnosis](#not-a-diagnosis)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Design system](#design-system)
- [Accessibility](#accessibility)
- [Testing](#testing)
- [Attribution](#attribution)
- [Licence](#licence)

---

## What it does

| Screen | What it is |
| ------ | ---------- |
| **Landing** | Sets the tone, with a live 4-2-6 breathing element |
| **Onboarding** | Name → what brings you here → coping style. Completing it is what "signed in" means |
| **Home** | Your space, with a greeting shaped by the profile |
| **Mood** | A daily check-in with tags and an optional note. One entry a day, editable, 30 days of history |
| **Self-check** | PHQ-9 and GAD-7, scored on-device against published bands, with crisis routing |
| **Echo** | Semantic search across everything you have written — the AI layer |
| **Journal** | A daily prompt and an autosaved draft |
| **Breathe** | Guided breathing, with a text guide for `prefers-reduced-motion` |
| **Settings** | JSON export, two-step erase, and a labelled sample-data toggle |

## The privacy model

Everything lives in `localStorage`. There is no server, so there is nowhere for
your data to go.

- **No backend, no account, no analytics.** "Signed in" is a completed profile
  object on the device.
- **Export** hands you the whole dataset as JSON. **Erase** is a two-step
  confirmation that clears every key and returns you to onboarding.
- **The one network request** in the entire application is the optional,
  explicitly-consented AI model download — weights coming *down*, never your
  data going *up*. See below.
- Sample data is labelled as sample wherever it appears, and removing it
  removes exactly the records it added.

## How the AI works

Echo **retrieves; it does not generate.** The model turns text into vectors and
that is the whole of its job. There is no language model writing sentences
about your mental health — so there is no hallucination surface, no invented
diagnosis, and nothing to police on the way out.

Describe how things are right now, and Echo finds the entries you have already
written that read like this one. The claim it makes is deliberately narrow, and
every part of it is evidence rather than interpretation:

> You have written something like this before · here it is, in your words ·
> here is what the fortnight after it looked like

### Why retrieval rather than a chatbot

|  | Generative companion | Retrieval (chosen) |
| --- | --- | --- |
| Download | ~880 MB | **~30 MB**, and optional |
| Requires WebGPU | Yes — excludes Safari, Firefox, most phones | **No** — WASM, runs everywhere |
| Can hallucinate | Yes, about someone's mental health | **No — it generates nothing** |
| Uses your data | Not unless you also build this | **It is the entire feature** |

The deciding argument was the last row. A generic chatbot is the least
differentiated thing a private journalling app could ship. Retrieval answers a
question only Mindful *can* answer, precisely because your journal is already on
the device — the privacy constraint becomes the advantage.

It is also therapeutically grounded rather than decorative. Depression's
cognitive signature is *"it has always been like this and it always will be"*,
and the strongest counter to that is not reassurance — it is your own record.

### The parts that took the thought

**Safety runs first, and without the model.** Risk assessment happens on the
input before any search, and does not depend on a download having succeeded. An
acute disclosure *replaces* the results rather than appearing above them —
answering "I don't want to be here anymore" with a list of old diary entries
would be a grotesque response to what was just said.

**The trajectory is allowed to deliver bad news.** If your check-ins fell after
a similar entry, Echo says so. Reporting only the times things improved would be
a comforting lie, and it is exactly the case where the honest next step is a
conversation with a person rather than reassurance from a browser tab.

**It will not claim a pattern it has not found.** Cosine similarity always
returns a nearest neighbour, so there is a relevance floor. Below it, Echo says
nothing matched rather than dressing noise up as insight.

**Two engines, and the free one is not a consolation prize.** Word-overlap
search works on any browser with no download at all. The model upgrades it from
matching vocabulary to matching meaning. The interface always names which one
answered, because a keyword pass that found nothing is weak evidence of absence.

**Cold start is solved with citations, not invention.** A library of guidance
from the NHS, NIMH, MedlinePlus, WHO and NCCIH means someone with no history yet
still gets something real. Mindful makes no health claims of its own: every card
names its source and links out, and the register is *"may help"*, never *"will
fix"*. One card reports NCCIH's own caveats about the evidence base, including
that roughly 8% of participants in a 2020 review had a negative effect from
practising meditation.

That library was fetched at build time and frozen into the bundle. A live
content feed would have quietly turned every reflection into a network request
carrying whatever the person had just typed.

**Vectors are held in memory only**, never written to storage. They are derived
from journal text, so a cached copy on disk would be one more thing the erase
button has to destroy.

## Not a diagnosis

The screeners are real instruments and the scoring is faithful to the published
bands, but a score is not a condition. Every result says so, in those words.

PHQ-9 item 9 — thoughts of self-harm — is tracked as a signal independent of the
total. Someone can score 1 overall and still have answered it, so when it is
flagged the crisis resources render *above* the score rather than below it. That
low-score case is exactly what a score-first layout would bury.

Crisis resources are permanently present on the self-check and Echo screens, not
something you have to score badly to be shown.

## Getting started

Requires Node.js 18+ (20+ recommended).

```bash
npm install
npm run dev
```

To try it with data in it, open **Settings → Load sample data**.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run lint` | ESLint over the project |
| `npm run test` | Playwright + axe suite (starts its own dev server) |
| `npm run verify` | `lint` + `build` + `test` — the pre-push gate |
| `npm run preview` | Serve the production build locally |

## Architecture

```
src/
├── App.tsx                    # Routes, all gated behind the on-device profile
├── main.tsx                   # BrowserRouter + ProfileProvider
├── index.css                  # Design tokens, base styles, reduced-motion
├── theme.ts                   # The same tokens for TypeScript
├── lib/
│   ├── storage.ts             # The localStorage layer: read, write, export, erase
│   ├── screener.ts            # PHQ-9 / GAD-7 items, bands, scoring, cadence
│   ├── crisis.ts              # Helplines and the emergency note
│   ├── echo/                  # The AI layer
│   │   ├── safety.ts          #   risk assessment — runs first, needs no model
│   │   ├── embeddings.ts      #   transformers.js loader, lazy and consented
│   │   ├── corpus.ts          #   your entries → searchable passages
│   │   ├── library.ts         #   the cited guidance library
│   │   ├── retrieve.ts        #   ranking, relevance floor, trajectory
│   │   └── keyword.ts         #   the no-model fallback search
│   ├── profile.ts · mood.ts · breathing.ts · prompts.ts · date.ts · cn.ts · motion.ts
│   └── sampleData.ts          # The labelled, removable demo dataset
├── context/                   # ProfileProvider + context object
├── hooks/                     # useProfile, useMindfulData, useBreathingSession, useEcho
├── components/
│   ├── PageShell.tsx          # Skip link, header, <main>, disclaimer
│   ├── RequireProfile.tsx     # The on-device gate
│   ├── AppNav.tsx             # The persistent bottom bar
│   ├── echo/ · screener/ · crisis/ · mood/ · journal/ · breathe/
│   └── ui/                    # Button, Card, Chip, TextField, ChoiceTile, …
└── routes/                    # One file per screen
```

**State.** `useSyncExternalStore` over `localStorage` rather than a context
provider — storage *is* the source of truth, so a write from any screen (or
another tab) reaches every subscriber without a provider sitting above them.

## Design system

The visual identity is the deliverable, so tokens live in three files that must
stay in step:

| File | Role |
| ---- | ---- |
| `src/index.css` | CSS variables — the runtime source of truth |
| `tailwind.config.js` | Tailwind theme, resolving to those variables |
| `src/theme.ts` | The same tokens for values that cross into JS |

**Palette.** A warm paper base (`cream`), grounded `sage` as primary, cool
`mist` and soft `lavender` supporting, and a single warm `clay` accent — at most
one accented element per screen. Never inline hex.

**Type.** Fraunces (`SOFT 30 / WONK 1`) for display, DM Sans for UI. Serif
carries statements; sans carries labels.

**Motion.** Everything should feel like breathing out: short travel, long easing
tails, no overshoot. `prefers-reduced-motion` disables all of it globally.

## Accessibility

WCAG 2.1 A/AA is verified, not assumed. The suite fails the build on any axe
violation, on every screen, in both empty and filled states.

- Every colour pair is contrast-checked, with ratios noted beside the tokens.
  The suite is what caught `text-subtle` sitting at 4.43:1 where the floating
  nav composites over a sunken card.
- One focus treatment app-wide (a mist ring, offset), plus a skip link.
- Choice tiles and screener options are real `<input type="radio">` /
  `type="checkbox"` elements, visually hidden but focusable — so roles, checked
  state and arrow-key movement come from the platform rather than from us.
- Each screener item is a `<fieldset>` whose `<legend>` is the question, so the
  four options read as a group rather than as orphaned words.
- Focus moves to the incoming heading on every onboarding, self-check and Echo
  stage change.
- Errors use `aria-describedby` / `aria-invalid` inside live regions.
- Nothing is signalled by colour alone: score bands are named in words, and bars
  only repeat what the text already says.

## Testing

**54 Playwright tests**, each screen covered empty and filled, every one ending
in an axe WCAG 2.1 A/AA scan.

```bash
npm run test
```

Echo's tests exercise the **keyword path exclusively**, so nothing downloads a
model in CI — and that is the path most visitors meet first. They cover the
no-download experience, the download disclosure, a real match with its
trajectory, the refusal to invent a match, the crisis interrupt both with and
without history, and the cold-start library path.

One test asserts document order directly: on a risk-flagged screener result, the
crisis heading must precede the score heading.

## Attribution

### Screening instruments

Reproduced verbatim and cited in the app itself, on the self-check screen.

- **PHQ-9** — Kroenke K, Spitzer RL, Williams JBW. *The PHQ-9: validity of a
  brief depression severity measure.* J Gen Intern Med. 2001;16(9):606–613.
- **GAD-7** — Spitzer RL, Kroenke K, Williams JBW, Löwe B. *A brief measure for
  assessing generalized anxiety disorder: the GAD-7.* Arch Intern Med.
  2006;166(10):1092–1097.

Both were developed by Drs Robert L. Spitzer, Janet B.W. Williams and Kurt
Kroenke, with an educational grant from Pfizer Inc. No permission is required to
reproduce, translate, display or distribute them.

### Echo's guidance library

Retrieved 2026-08-13, distilled, and frozen into the bundle. Every card names
its source in the copy and links to the original.

| Source | Licence |
| ------ | ------- |
| NHS | Contains public sector information licensed under the Open Government Licence v3.0 |
| NIMH | US federal government work — public domain |
| MedlinePlus (US National Library of Medicine) | US federal government work — public domain |
| NCCIH | US federal government work — public domain |
| World Health Organization | © WHO, reproduced under CC BY-NC-SA 3.0 IGO — not an endorsement of Mindful |

### Model

`sentence-transformers/all-MiniLM-L6-v2` (Apache 2.0), in the `Xenova` ONNX
conversion, run via 🤗 transformers.js (Apache 2.0).

### Crisis resources

Find a Helpline, Befrienders Worldwide, Crisis Text Line, 988 Suicide & Crisis
Lifeline, Samaritans and Lifeline are independent services, not affiliated with
Mindful.

### Other

Typefaces: Fraunces and DM Sans, both SIL Open Font License. Icons: lucide.

## Conventions

- Style with Tailwind utilities. New colours go in `index.css` **and**
  `tailwind.config.js` **and** `theme.ts` — never inline hex.
- Screener item wording, options and band thresholds are not editorial copy.
  Changing them makes the published scoring bands meaningless.
- Echo retrieves; it never generates. If a change would have the app write a
  sentence about someone's mental health rather than quote one of theirs or an
  attributed source, it is the wrong change.
- No runtime network call, ever — including for content.
- Any screen that could read as health guidance renders `<Disclaimer />`;
  `PageShell` does it for you.
- Run `npm run verify` before pushing.

## Licence

MIT — see [LICENSE](LICENSE). This covers Mindful's own source code; the
third-party content and models it references carry their own terms, listed
under [Attribution](#attribution).
