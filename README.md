# Mindful

A private mental-health and concussion-recovery companion that runs entirely in
the browser. No backend, no account, no analytics, and no runtime network call —
including for the AI.

Built solo for **Hack for Humanity, Summer 2026**.

> **Mindful is not medical advice.** It offers reflective self-care prompts,
> validated screening questionnaires, and published recovery guidance from named
> health bodies. It does not diagnose, treat, clear anyone to return to sport, or
> replace care from a qualified professional. The disclaimer renders on every
> screen.

---

## Contents

- [What it does](#what-it-does)
- [The privacy model](#the-privacy-model)
- [How the AI works](#how-the-ai-works)
- [Concussion recovery](#concussion-recovery)
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
| **Echo** | Hybrid retrieval across everything you have written — the AI layer |
| **Ask** | Evidence-first answers to health questions: risk-gated, citation-locked, independently verified |
| **Journal** | A daily prompt and an autosaved draft |
| **Breathe** | Guided breathing, with an on-device voice and an eyes-closed mode that needs no screen |
| **Recovery** | Concussion danger signs, a 22-symptom daily record, and graduated return-to-learn / return-to-sport plans |
| **Settings** | JSON export, two-step erase, and a labelled sample-data toggle |

## The privacy model

Everything lives in `localStorage`. There is no server, so there is nowhere for
the data to go.

- **No backend, no account, no analytics.** "Signed in" is a completed profile
  object on the device.
- **A Content-Security-Policy enforces it.** `connect-src 'self'` means
  exfiltrating an entry is a request the browser blocks, not a code-review
  question. `form-action 'none'`, `object-src 'none'`, `base-uri 'self'` and
  `font-src 'self'` back it up.
- **Fonts are self-hosted.** Loading them from a CDN sent an IP address, a user
  agent and a referring URL to a third party on every page load, including the
  page that promises none of that happens.
- **The one network request** in the application is the optional,
  explicitly-consented AI model download — weights coming *down*, never data
  going *up*. Its hosts are named individually in the policy.
- **Free-text fields set `spellcheck="false"` and `autocomplete="off"`.**
  Enhanced spellcheck uploads what is typed to be checked; form history keeps
  copies outside the namespace that "erase everything" sweeps.
- **Export** hands over the whole dataset as JSON, generated in the page.
  **Erase** is a two-step confirmation that clears every key and re-gates the app
  without a reload.
- **Nothing in cookies, sessionStorage or IndexedDB.** Verified by the suite.
- **Failing does not disclose.** An error boundary catches render crashes and
  shows a fallback with no message, no stack, no component trace and no "copy
  error" affordance — just what broke, that the entries are still on the device
  and were never sent anywhere, and a way out.
- **Production builds drop every `console.*` and `debugger`,** so a stray log
  line cannot ship. No source maps either: they would hand anyone with devtools
  the crisis-detection patterns, which are the one part of this codebase that is
  easier to evade if you can read it.
- **Every citation is `https`.** MedQuAD carries some `http://` URLs from older
  NIH pages; the corpus upgrades them, because an http link in a health app
  leaks which condition someone just read about, in cleartext.

Two test suites hold this up rather than describing it. `tests/privacy.spec.ts`
drives a full session of real use — a mood note, a journal entry, a search, a
self-check, a voice-guided breathing session, an export — while recording every
request the browser makes, and fails on any request to any other origin.
`tests/security.spec.ts` covers the rest: the profile gate against URL
manipulation, storage residue, stored XSS, and referrer leakage.

## How the AI works

Echo **retrieves; it does not generate.** The model turns text into vectors and
that is the whole of its job. There is no language model writing sentences about
anyone's mental health, so there is no hallucination surface.

Describe how things are right now, and Echo finds the entries you have already
written that read like this one:

> You have written something like this before · here it is, in your words ·
> here is what the fortnight after it looked like

### Why retrieval rather than a chatbot

|  | Generative companion | Retrieval (chosen) |
| --- | --- | --- |
| Download | ~880 MB | **~30 MB**, and optional |
| Requires WebGPU | Yes — excludes Safari, Firefox, most phones | **No** — WASM, runs everywhere |
| Can hallucinate | Yes, about someone's mental health | **No — it generates nothing** |
| Uses your data | Not unless you also build this | **It is the entire feature** |

Retrieval answers a question only Mindful *can* answer, precisely because the
journal is already on the device. It is also therapeutically grounded rather
than decorative: depression's cognitive signature is *"it has always been like
this and it always will be"*, and the strongest counter to that is a person's
own record.

### The pipeline

Seven stages, each with one job, a defined input and output, and its own tests.

```
guard → expand → retrieve → fuse → aggregate → rerank → verify
```

1. **guard** — risk assessment on the input, before anything is searched, with
   no dependency on the model having downloaded. Written in the language people
   actually use — contractions folded, and the moderation-era euphemisms
   ("kms", "unalive") caught alongside the clinical phrasing — held up by a
   73-case battery of acute, concerning, and deliberately benign phrasings, and
   **audited against ~53,000 real statements** (see below).
2. **expand** — stemming, contraction folding, and a curated near-synonym set
   applied to the query only.
3. **retrieve** — two independent rankings: BM25 over terms, cosine over
   embeddings. Each applies its own relevance floor.
4. **fuse** — reciprocal rank fusion, by position rather than score. Cosine and
   BM25 are different scales; normalising them would invent a comparison that
   does not exist.
5. **aggregate** — chunks fold back into the entry they came from, max-pooled.
6. **rerank** — maximal marginal relevance, so one bad week written up four
   times cannot fill the answer. The top match is never displaced.
7. **verify** — see below.

Both retrievers run on-device. With no model downloaded, the same seven stages
run with one arm instead of two — a supported mode, and the one most people meet
first.

### The verification layer

Nothing reaches the screen until it passes:

| Check | Guarantee |
| ----- | --------- |
| **provenance** | Every result names a record that is in storage *now*, not when the index was built |
| **verbatim** | The text shown is a literal substring of what the person wrote — a stale index or bad chunk boundary cannot put words in anyone's mouth |
| **support** | A claim about what happened next survives only while the check-ins backing it do |
| **attribution** | Library cards must carry an allowlisted source, and only one card per source is shown |
| **resurfacing** | If a search returns something written in acute distress, support is offered alongside it |

Dropped results are recorded with a reason rather than silently discarded. Each
surviving result explains itself on the page — same words, related words, close
in meaning — and the pipeline publishes its stage-by-stage working.

### Measured, not eyeballed

`src/lib/echo/evaluation.ts` holds a fixed corpus, a query set with known right
answers, and two metrics. It runs in the test suite with no model and no browser.

| Slice | recall@3 | MRR |
| ----- | -------- | --- |
| Overall | 0.85 | 0.85 |
| Plain prose | 1.00 | 1.00 |
| Clipped phone typing | 1.00 | 1.00 |
| Second-language phrasing | 1.00 | 1.00 |
| Metaphor | 0.25 | 0.25 |

The harness also reports median latency per query, so a change that makes
retrieval slow enough to feel shows up as a number in CI output.

The register slices are a fairness check, not a curiosity: a retriever that
scores well on tidy prose and badly on how people actually type works better for
people who write like the person who built it. The parity gap is asserted in CI.
The metaphor slice is the known limit of lexical matching — it stays in the
report rather than being quietly excluded, and it is what the dense arm is for.

The harness earned itself immediately: it caught the confidence floor discarding
an entry that said *"lying awake"* in answer to *"I cannot sleep"*, because only
literal word matches counted. Recall@3 went from 0.75 to 0.85 and the three
literal registers from 0.88/1.00/0.75 to parity.

### Other decisions that took the thought

**Safety runs first, and without the model.** An acute disclosure *replaces* the
results rather than appearing above them.

**The trajectory is allowed to deliver bad news.** If check-ins fell after a
similar entry, Echo says so.

**It will not claim a pattern it has not found.** Below the relevance floor, Echo
says nothing matched rather than dressing a nearest neighbour up as insight.

**Cold start is solved with citations, not invention.** A frozen library from the
NHS, NIMH, MedlinePlus, WHO and NCCIH covers someone with no history yet. Every
card names its source and links out, and the register is *"may help"*, never
*"will fix"*.

**Vectors are held in memory only**, never written to storage.

## Ask: an evidence-first health pipeline

Ask answers health questions through the pipeline the "evidence-first AI"
playbook describes — risk classification before anything else, retrieval from a
curated evidence base, composition, independent verification — with one
deliberate substitution: **the generation stage is extractive, not an LLM**.
Every factual sentence is lifted verbatim from an evidence document and carries
its citation; connective text comes from a hand-written template bank. A cloud
model would ship health questions to a third-party API, and a small on-device
generator is most fluent exactly where it is least reliable. Generate less,
verify more — taken literally, hallucination rate 0.00 by construction, and a
verifier to keep it there.

```
risk → intent → retrieve (hybrid) → rerank → compose → verify
     ↳ emergency? escalate, retrieval skipped
     ↳ crisis language? crisis support
     ↳ unclear / too vague? ask a clarifying question
     ↳ verification fails? recompose strictly, then fall back to saying less
```

- **Risk classification** (LOW/MODERATE/HIGH/UNKNOWN): the published emergency
  patterns — chest pain, stroke signs, anaphylaxis, meningitis signs,
  thunderclap headache, cauda equina, infant fever — escalate before any
  retrieval runs. Mental-health crisis routes to crisis support instead.
- **Intent classification**: rule-first for the two intents where an error is
  expensive (medication, diagnosis requests), then a **trained classifier** for
  the rest — see below. `unclear` is a first-class answer, but it no longer
  refuses on its own: intent chooses the framing, and the *evidence* decides
  whether there is an answer.
- **Independent verification**: re-derives everything from scratch — is each
  claim literally present in its cited document, does the citation actually
  pertain to the question, does any sentence diagnose/dose/promise, is
  uncertainty stated. Produces a structured verdict shown on the page.
- **Answers in the safe-response format**: direct answer, what the evidence
  says (each card a named org with a real link and retrieval date), what is
  uncertain, what to do next, when to seek help.
- **Prompt injection is inert by construction** — there is no prompt. Embedded
  instructions are data to classifiers and retrievers, and the eval proves an
  attacker's text never reaches the output.

Its evaluation runs in CI with eight adversarial categories (normal, ambiguous,
high-risk, hallucination-bait, contradictory, out-of-scope, injection, bias
pairs):

| Metric | Result | Gate |
| ------ | ------ | ---- |
| Escalation recall | 1.00 | must be 1.00 |
| Hallucination rate | 0.00 | must be 0.00 |
| Bias parity | 1.00 | must be 1.00 |
| Retrieval accuracy | 1.00 | ≥ 0.90 |
| Citation accuracy | 1.00 | ≥ 0.99 |
| Clarification recall | 1.00 | must be 1.00 |
| Median latency | <1ms | — |

The harness caught three real defects during development: an escalation miss on
a cauda-equina phrasing, intent scores diluted by query length, and generic
words outvoting "headache" — the last fixed by moving the classifier to BM25,
where a term is worth what it discriminates.

### Trained classifiers

Intent and risk are classified by models fitted on a labelled dataset, not by
heuristics alone. Two heads per task, from the same data:

| Head | Features | Intent macro-F1 | Risk macro-F1 |
| ---- | -------- | --------------- | ------------- |
| **embedding** | Sentence vectors from `Xenova/all-MiniLM-L6-v2` | **0.90** | **0.74** |
| **lexical** | TF-IDF over unigrams and bigrams | 0.63 | 0.41 |

The embedding head is ordinary transfer learning, and it is the reason the
classifier generalises past the phrasings anyone wrote down: the pretrained
encoder already knows "my head feels heavy" and "I have a headache" are
neighbours, so a few hundred labelled examples only have to teach the decision
boundary rather than the language. It reuses the query vector retrieval already
computes, so the better classifier costs no extra model and no extra forward
pass. Softmax regression rather than anything deeper, because it is convex (the
committed weights are reproducible, not a lucky seed), it cannot overfit a small
dataset the way a deeper model would, and every lexical weight belongs to one
readable word.

`npm run train` refits both heads, prints a confusion matrix and per-class
precision/recall, and writes the artefacts. Training happens on a developer
machine; users receive a few kilobytes of learned weights.

**The dataset's limitation, stated because it is the important one:** the 355
labelled examples are hand-authored for this project. No real user data was
used — which is the only way to build a supervised classifier for an app that
promises nothing leaves the device — and the cost is that the model learns one
author's idea of how people write. The register mix (tidy prose, phone typing,
second-language phrasing) is the mitigation, the held-out split is the
measurement, and neither makes it go away. It is recorded in the model artefact
itself.

**Two safety asymmetries** keep the models subordinate to the rules. Diagnosis
requests and medication questions are matched by pattern first, because a
classifier at 0.90 is wrong one time in ten and that is not an acceptable rate
for either. And on risk, the trained head may only ever *raise* a level, never
lower one — and cannot reach `high` at all, since an emergency route deserves a
pattern a person can read rather than a probability.

### The crisis guard, audited against real text

The guard's recall had only ever been measured against phrasings written by the
person who wrote the guard — which measures imagination, not coverage. It is now
audited against the Kaggle *Sentiment Analysis for Mental Health* corpus:
~53,000 statements scraped from social media and labelled by mental-health
status.

| Slice | Before | After |
| ----- | ------ | ----- |
| Recall on `Suicidal` (10,652 statements) | 51.7% | **53.6%** |
| False-positive rate on `Normal` (16,343) | 0.2% | **0.2%** |

Two hundred more real disclosures caught, for two more false positives out of
sixteen thousand. The new patterns — method-seeking, lethality questions,
overdose in progress, named self-harm methods, "I just want to end it" — came
from *reading* what the guard walked past. They were not exotic phrasings; they
were simply not the ones anyone had thought to write down.

**How to read 53.6%.** It is a loose lower bound. The corpus labels a post's
overall status, not whether a sentence discloses intent, so a large share of
`Suicidal` rows contain no disclosure at all — someone describing a bad week,
asking about medication, replying to a thread. A guard that fired on all of them
would be a guard that fires on everything. The number worth watching is the
direction, alongside precision holding.

Inspecting the 29 false positives is instructive too: most are dataset
mislabels ("i just cut myself again", labelled `Normal`) or harmless idiom
("did km on the treadmill and want to die"). Given the stated policy — a
helpline shown to someone quoting a lyric costs a moment's annoyance, a missed
disclosure cannot be undone — those are the right side to err on.

**The corpus is not in this repository, and nothing from it is reproduced.** It
is 31MB of real people's mental-health disclosures from public platforms.
DbCL-1.0 would permit redistribution; the ODbL share-alike that DbCL defers to
sits badly with this project's MIT licence, the licence explicitly does not
cover the privacy rights of the people who wrote those posts, and republishing
them inside a hackathon entry is the wrong thing to do regardless. What is
committed is what was learned: the patterns, and the numbers above. Run
`npx tsx scripts/audit-crisis-guard.ts <path>` against a local copy to reproduce
them.

### The evidence corpus

~340 documents, each carrying org, title, topic, type, URL and retrieval date.
Four feeds:

1. **A curated slice of MedQuAD**, the US National Library of Medicine's
   question-answering collection — real Q&A pairs from MedlinePlus, NIDDK,
   NINDS, NHLBI and CDC pages, each keeping the URL it came from. Curated, not
   taken whole: `npm run build:evidence` keeps the consumer-facing sources, the
   question types Ask has a lane for, and an explicit list of common health
   topics. Most of MedQuAD is rare disease, and shipping all 47,000 rows would
   have diluted retrieval for the questions people actually ask.
2. Physical-health documents written for Ask (NHS, WHO, MedlinePlus), kept
   because they are written in the register people ask in and carry the
   emergency thresholds a general corpus does not foreground.
3. Echo's mental-health library.
4. The concussion guidance and neuroscience notes.

The optional 30MB embedding model is shared with Echo; without it the same
pipeline runs lexical-only, which is the mode CI tests.

## Concussion recovery

Built for the Concussion Alliance & Synapse track. Three things a person
recovering from a head injury needs and rarely has.

**The danger signs, first and unprompted.** The CDC HEADS UP list, unchanged, at
the top of the screen on every visit. No scoring and no risk band: one sign is
the whole threshold, and the response is the same every time.

**A symptom record worth taking to an appointment.** The 22-symptom evaluation
used in concussion care, rated 0–6, stored per item so three weeks of checks show
which symptoms moved. A rising total or symptoms past four weeks prompts a
conversation, not a verdict. A one-click **printable clinician summary** turns
the record into the sheet an appointment actually starts from: totals by day,
the domain split, the most affected symptoms, and where the person is on the
return ladder — dry by design, because the reading belongs to the clinician.

**The neuroscience, because understanding it is itself treatment.** Trial
evidence (Ponsford et al., 2002) found that early education about concussion —
what the symptoms are, why they happen, that they usually resolve — reduces how
long they last. So the mechanisms behind every rule are on the page: the
neurometabolic cascade and the energy crisis (Giza & Hovda), the vulnerability
window behind the contact gates, why sub-threshold exercise restores regulation
where pushing does not, and why sleep is repair. Each mechanism ends by naming
the specific behaviour in the app it produced.

**Graduated return plans, with the rules enforced in code.** Four steps back to
learning or work, six back to sport, from the Amsterdam 2023 consensus, with
learning taking precedence. The evidence base is the one the field actually
uses: the Amsterdam consensus, the Living Concussion Guidelines (adults 18+),
and the PedsConcussion living guideline — with the pediatric scope stated
rather than implied.

| Rule | Implementation |
| ---- | -------------- |
| Minimum 24 hours per stage | The advance button does not exist until the clock is up, with the reason shown in its place |
| Mild, brief symptom increase only (≤2 points on a 0–10 scale, settling within an hour) | Reporting worse than that withdraws the offer to advance |
| Baseline symptoms before contact stages | Gated from stage 4 |
| Clinician clearance before full contact | Gated from stage 5, recorded as something a clinician said — never something the app decided |
| Symptoms returning during contact stages | Drops to stage 3, not one step down into another chance to be hit |

Going backwards is a button the same size as going forwards.

Every clinical line names who said it, links to them, is paraphrased rather than
reproduced, and carries the date it was checked. That includes the guidance that
changed: prolonged strict rest is no longer recommended, and light aerobic
exercise below the symptom threshold after the first 48 hours speeds recovery.

The screen ends with what it cannot do — it does not diagnose, it never clears
anyone to play, it knows nothing about medical history or medication, and a
clinician's plan overrides it.

The connections to the rest of the app are clinical rather than promotional.
Sleep and mood predict slow recovery and Mindful already tracks both; light
sensitivity makes screens unusable, which is what the eyes-closed breathing mode
is for.

## Breathing, with the screen closed

Sensitivity to light is among the most common concussion symptoms and a common
feature of migraine and anxiety, which makes most self-care apps unusable at
exactly the moment they are needed. The breathing screen can dim itself entirely
and hand pacing to a voice: the whole surface becomes one pause target, Escape
stops, and a screen wake lock keeps the device from sleeping through a session
nobody is touching.

The voice is **on-device only**. Every hosted text-to-speech API would ship the
words to a server, so it uses `SpeechSynthesis` and takes only voices the
platform reports as `localService` — cloud-backed voices are filtered out rather
than deprioritised, and where no local voice exists the guide reports itself
unavailable instead of quietly using a remote one.

Safety ships with it: the cautions for the chosen rhythm are on screen before
Begin, the eyes-closed checks are confirmed once before the first dark session,
and the dizziness reminder is spoken at the start of every session. Provenance is
stated per rhythm — the NHS describes the 5-5 one; the two that hold the breath
say plainly that they are widely taught rather than borrowing an authority they
do not have.

## Not a diagnosis

The screeners are real instruments and the scoring is faithful to the published
bands, but a score is not a condition. Every result says so, in those words.

PHQ-9 item 9 — thoughts of self-harm — is tracked as a signal independent of the
total. Someone can score 1 overall and still have answered it, so when it is
flagged the crisis resources render *above* the score rather than below it.

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
| `npm run train` | Refit both classifier heads and rewrite the model artefacts |
| `npm run build:evidence` | Rebuild the MedQuAD slice of the evidence corpus |
| `npx tsx scripts/audit-crisis-guard.ts <csv>` | Audit crisis-guard recall and precision against a local corpus |
| `npm run verify` | `lint` + `build` + `test` — the pre-push gate |
| `npm run preview` | Serve the production build locally |

## Architecture

```
src/
├── App.tsx                    # Routes, all gated behind the on-device profile
├── main.tsx                   # BrowserRouter + ProfileProvider
├── fonts.css                  # Self-hosted @font-face — no CDN
├── index.css                  # Design tokens, base styles, reduced-motion
├── theme.ts                   # The same tokens for TypeScript
├── lib/
│   ├── storage.ts             # The localStorage layer: read, write, export, erase
│   ├── screener.ts            # PHQ-9 / GAD-7 items, bands, scoring, cadence
│   ├── crisis.ts              # Helplines and the emergency note
│   ├── voice.ts               # On-device speech; filters out cloud voices
│   ├── breathCues.ts          # What the spoken guide says, in one reviewable place
│   ├── breathingSafety.ts     # Per-rhythm cautions, provenance, eyes-closed checks
│   ├── echo/                  # The AI layer
│   │   ├── pipeline.ts        #   the seven stages, in order
│   │   ├── safety.ts          #   risk assessment — runs first, needs no model
│   │   ├── verify.ts          #   provenance, verbatim, attribution, resurfacing
│   │   ├── evaluation.ts      #   fixed eval set, recall@3 / MRR, register parity
│   │   ├── keyword.ts         #   tokenisation and BM25
│   │   ├── expand.ts          #   curated query expansion
│   │   ├── fuse.ts            #   reciprocal rank fusion + MMR reranking
│   │   ├── embeddings.ts      #   transformers.js loader, lazy and consented
│   │   ├── corpus.ts          #   your entries → searchable passages
│   │   ├── library.ts         #   the cited guidance library
│   │   └── retrieve.ts        #   thresholds, match shape, trajectory
│   ├── guide/                 # Ask: the evidence-first Q&A pipeline
│   │   ├── pipeline.ts        #   risk → intent → retrieve → compose → verify
│   │   ├── risk.ts            #   emergency patterns; conservative by design
│   │   ├── intent.ts          #   rule-first + BM25 prototype classifier
│   │   ├── evidence.ts        #   the cited corpus, with per-document metadata
│   │   ├── compose.ts         #   extractive "generation" — cannot invent facts
│   │   ├── verify.ts          #   independent verdicts: grounding, scope, citations
│   │   └── evaluation.ts      #   eight adversarial categories, gated in CI
│   ├── concussion/            # The recovery layer
│   │   ├── redflags.ts        #   CDC danger signs, shown unprompted
│   │   ├── symptoms.ts        #   the 22-item check and its scoring
│   │   ├── protocol.ts        #   return-to-learn / return-to-sport, and the gates
│   │   ├── neuroscience.ts    #   the mechanism behind each rule, cited
│   │   └── evidence.ts        #   sources, guidance, and stated limitations
│   ├── profile.ts · mood.ts · breathing.ts · prompts.ts · date.ts · cn.ts · motion.ts
│   └── sampleData.ts          # The labelled, removable demo dataset
├── context/                   # ProfileProvider + context object
├── hooks/                     # useProfile, useMindfulData, useEcho, useBreathingSession,
│                              # useBreathCues, useVoiceGuide, useWakeLock
├── components/
│   ├── PageShell.tsx          # Skip link, header, <main>, disclaimer
│   ├── RequireProfile.tsx     # The on-device gate
│   ├── AppNav.tsx             # The persistent bottom bar
│   ├── echo/ · screener/ · crisis/ · mood/ · journal/ · breathe/ · concussion/
│   └── ui/                    # Button, Card, Chip, Overlay, TextField, ChoiceTile, …
└── routes/                    # One file per screen
```

**State.** `useSyncExternalStore` over `localStorage` rather than a context
provider — storage *is* the source of truth, so a write from any screen (or
another tab) reaches every subscriber without a provider sitting above them.

**Modals** render through a portal, mark the app root `inert`, and hide it
outright when the overlay is opaque. That last part is not tidiness: an overlay
that only paints over the page leaves the text beneath it on screen as far as a
contrast checker is concerned.

## Design system

The visual identity is the deliverable, so tokens live in three files that must
stay in step:

| File | Role |
| ---- | ---- |
| `src/index.css` | CSS variables — the runtime source of truth |
| `tailwind.config.js` | Tailwind theme, resolving to those variables |
| `src/theme.ts` | The same tokens for values that cross into JS |

**Palette.** A warm paper base (`cream`), grounded `sage` as primary, cool `mist`
and soft `lavender` supporting, and a single warm `clay` accent — at most one
accented element per screen. Never inline hex.

**Type.** Fraunces (`SOFT 30 / WONK 1`) for display, DM Sans for UI, both
self-hosted as variable fonts.

**Motion.** Short travel, long easing tails, no overshoot.
`prefers-reduced-motion` disables all of it globally — and on the breathing
screen *replaces* the animation with a text guide paced by the same clock rather
than simply switching it off.

## Accessibility

WCAG 2.1 A/AA is verified, not assumed. The suite fails the build on any axe
violation, on every screen, in both empty and filled states — including the
dimmed eyes-closed session.

- Every colour pair is contrast-checked, with ratios noted beside the tokens.
- One focus treatment app-wide (a mist ring, offset), plus a skip link.
- Choice tiles, chips and screener options are real `<input type="radio">` /
  `type="checkbox"` elements, visually hidden but focusable — so roles, checked
  state and arrow-key movement come from the platform.
- Symptom ratings carry their word anchor in the accessible name: "4 out of 6 —
  Moderate", never a bare glyph.
- Each screener item is a `<fieldset>` whose `<legend>` is the question.
- Focus moves to the incoming heading on every onboarding, self-check and Echo
  stage change, and into and back out of every modal.
- Nothing is signalled by colour alone.
- When the spoken guide is on, the on-screen live region steps aside — hearing
  the same step twice, once from the app and once from a screen reader, would be
  worse than either.

## Testing

**183 Playwright tests** across 16 spec files, each screen covered empty and
filled, every screen ending in an axe WCAG 2.1 A/AA scan.

```bash
npm run test
```

| Suite | What it holds up |
| ----- | ---------------- |
| `privacy.spec.ts` | No request to any origin but this one, across a full session of real use |
| `security.spec.ts` | The profile gate against URL manipulation, storage residue, stored XSS, referrer leakage, and that a crash leaks neither user text nor a stack trace |
| `echo-retrieval.spec.ts` | recall@3, MRR, register parity, ranking mechanics, and every verification rule — in Node, with no model |
| `recovery.spec.ts` | Every gate in the return protocol, including the one that refuses to clear anyone for contact |
| `breathe.spec.ts` | What the voice says and when, and that it says nothing when switched off |
| `guide-classifier.spec.ts` | Train/eval disjointness, published metrics, rules outranking the model, corpus id uniqueness |
| `crisis-language.spec.ts` | 73 phrasings of crisis, concern and everyday idiom — including the euphemisms platform moderation trained people into, and guards against the newer patterns over-reaching |
| `guide-pipeline.spec.ts` | Ask's eval gates, the verifier red-teamed with corrupted responses, injection inertness |
| `ask.spec.ts` | The safe-response format on screen, escalation replacing education, a11y in every state |

Echo's browser tests exercise the **lexical path exclusively**, so nothing
downloads a model in CI — and that is the path most visitors meet first.

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

### Concussion guidance

Paraphrased rather than reproduced, cited in the app, checked 2026-08-14.

| Source | Used for |
| ------ | -------- |
| CDC HEADS UP | The danger signs, verbatim as a list |
| Amsterdam consensus statement 2023 (Patricios et al., *BJSM*) | Graduated return-to-learn and return-to-sport strategies, stage rules, persisting-symptom definition |
| Living Concussion Guidelines (adults 18+) | Prolonged-symptom management, sleep guidance |
| PedsConcussion Living Guideline | The pediatric reference, and the stated scope limit |
| Concussion Alliance | Sleep, mood and recovery summaries |
| Macnow et al., *JAMA Pediatrics* 2021 | Screen-time guidance in the first 48 hours |
| Leddy et al. | Sub-symptom-threshold aerobic exercise |
| MedQuAD (US National Library of Medicine) | ~290 documents of Ask's evidence corpus, from MedlinePlus / NIDDK / NINDS / NHLBI / CDC pages, each linked to its source |
| Giza & Hovda, *Neurosurgery* 2014 | The neurometabolic cascade behind the mechanism explanations |
| Ponsford et al., *JNNP* 2002 | The evidence that education itself reduces persisting symptoms |

The 22-item symptom evaluation is the post-concussion symptom scale used in
concussion care. The SCAT itself is the Concussion in Sport Group's instrument
and is not reproduced here.

### Echo's guidance library

Retrieved 2026-08-13, distilled, and frozen into the bundle. Every card names its
source in the copy and links to the original.

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

Typefaces: Fraunces and DM Sans, both under the SIL Open Font License, served
from `public/fonts/` with their licences alongside. Icons: lucide.

## Conventions

- Style with Tailwind utilities. New colours go in `index.css` **and**
  `tailwind.config.js` **and** `theme.ts` — never inline hex.
- Screener item wording, options and band thresholds are not editorial copy.
  Changing them makes the published scoring bands meaningless. The same applies
  to the concussion stage rules and thresholds.
- Echo retrieves; it never generates. If a change would have the app write a
  sentence about someone's mental health rather than quote one of theirs or an
  attributed source, it is the wrong change.
- The app never clears anyone to return to sport.
- No runtime network call, ever — including for content and fonts.
- Any screen that could read as health guidance renders `<Disclaimer />`;
  `PageShell` does it for you.
- Run `npm run verify` before pushing.

## Licence

MIT — see [LICENSE](LICENSE). This covers Mindful's own source code; the
third-party content and models it references carry their own terms, listed under
[Attribution](#attribution).
