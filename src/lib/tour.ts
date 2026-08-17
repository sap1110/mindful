/**
 * The guided tour — what Mindful does, shown rather than described.
 *
 * Every step carries a working piece of the actual app. The breathing step
 * breathes, the check-in step takes a check-in, and the Ask step runs the real
 * retrieval pipeline against the real evidence corpus and prints the citation
 * it landed on. That is the whole design rule here: a tour made of screenshots
 * is a brochure, and this app's central claim — that it answers from evidence
 * and never invents — is only worth anything if you can watch it happen.
 *
 * Nothing a demo does is written to the device. Someone taking the tour has
 * not decided to use Mindful yet, and a walkthrough that quietly seeds their
 * history with practice data would be a poor way to open a relationship with
 * an app whose main promise is about what it does with your data.
 *
 * The content lives here and the demos live in `components/tour`, so this file
 * stays readable as prose — it is the script for the tour, and the script is
 * the part most likely to need rewording.
 */

export interface TourStep {
  /** Also the `?step=` value, so any step can be linked to directly. */
  id: string
  /** Short label for the progress trail and the step counter. */
  trail: string
  eyebrow: string
  title: string
  /** One or two paragraphs. Kept short — the demo underneath does the work. */
  body: readonly string[]
  /** The real screen this step is about, once there is a profile to see it. */
  destination?: { to: string; label: string }
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'private',
    trail: 'Private',
    eyebrow: 'First, the part that matters',
    title: 'Nothing you type here leaves this device.',
    body: [
      'There is no account, no server and no analytics. Mindful is a page that runs in your browser and keeps what you write in your browser. Close the tab and it is still only here; clear the site data and it is gone for good.',
      'That is a strong claim, so this page checks it live rather than asking you to take it on trust. Below is every request this page has made since it loaded, counted by where it went.',
    ],
  },
  {
    id: 'check-in',
    trail: 'Check in',
    eyebrow: 'The daily check-in',
    title: 'One tap, most days. That is the whole habit.',
    body: [
      'Five levels, an optional word or two about why, and you are done. There is no streak to keep and nothing goes red when you miss a day — the point is a record you can look back on, not another thing to be good at.',
      'Try it. This one is a demonstration, so nothing is saved.',
    ],
    destination: { to: '/mood', label: 'Open the check-in' },
  },
  {
    id: 'journal',
    trail: 'Journal',
    eyebrow: 'The journal',
    title: 'A prompt if you want one. A blank page if you do not.',
    body: [
      'A new question each day, which you can ignore entirely. What you type is kept as you go, so a closed tab never costs you a paragraph.',
      'Write a line here if you like — again, this demo keeps nothing.',
    ],
    destination: { to: '/journal', label: 'Open the journal' },
  },
  {
    id: 'breathe',
    trail: 'Breathe',
    eyebrow: 'Guided breathing',
    title: 'Twelve seconds is a real session.',
    body: [
      'Three rhythms, for as long or short as you want, with the option of a spoken guide so you can put the screen face-down and shut your eyes. The words always carry the pace, never the animation alone.',
      'Here is one breath, at the same 4-2-6 rhythm the app opens on.',
    ],
    destination: { to: '/breathe', label: 'Open breathing' },
  },
  {
    id: 'ask',
    trail: 'Ask',
    eyebrow: 'Ask — the part people ask about',
    title: 'It answers from published evidence, or it says it cannot.',
    body: [
      'Ask is not a chatbot with a medical disclaimer. There is no generative model in it at all. It classifies how urgent the question is, works out what kind of question it is, searches a corpus of documents from named health bodies, assembles an answer only from sentences those documents actually contain, and then runs a separate verifier over the result before you see it.',
      'This runs the real pipeline, on this device, right now. Pick a question and watch what comes back — including the sources, and the verifier’s own numbers.',
    ],
    destination: { to: '/ask', label: 'Open Ask' },
  },
  {
    id: 'clinical',
    trail: 'Clinical',
    eyebrow: 'Self-check and Recovery',
    title: 'Where Mindful stops being an app about feelings.',
    body: [
      'Two places hold real clinical instruments, and both follow the rules those instruments come with rather than a friendlier version of them.',
    ],
    destination: { to: '/self-check', label: 'Open self-check' },
  },
  {
    id: 'data',
    trail: 'Your data',
    eyebrow: 'Your data',
    title: 'Take it with you, or take it away.',
    body: [
      'Everything Mindful holds can be downloaded as one JSON file — the format to hand a clinician — and everything can be erased in two clicks, immediately and completely.',
      'Here is exactly what is on this device at the moment.',
    ],
    destination: { to: '/settings', label: 'Open your data' },
  },
] as const

export const TOUR_TRAIL = TOUR_STEPS.map((step) => step.trail)

/** Resolve a `?step=` value to an index, tolerating anything unexpected. */
export function tourStepIndex(id: string | null): number {
  if (!id) return 0
  const index = TOUR_STEPS.findIndex((step) => step.id === id)
  return index === -1 ? 0 : index
}
