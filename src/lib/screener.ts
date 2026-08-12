/**
 * The validated self-checks: PHQ-9 and GAD-7.
 *
 * These are real, published instruments, reproduced verbatim. Both are free to
 * use without permission, and both are cited in `SCREENERS` below — changing an
 * item's wording would make the scoring bands meaningless, so the text here is
 * not editorial copy and must not be "improved".
 *
 * What this module deliberately does *not* do is diagnose. A PHQ-9 of 17 is not
 * "moderately severe depression", it is "answers that fall in the moderately
 * severe range on a questionnaire" — a prompt to talk to somebody qualified,
 * never a verdict. Every string below is written to hold that line, because the
 * screen that renders them cannot put it back if it is lost here.
 */

/** Every item on both instruments uses the same four-point frequency scale. */
export type ScreenerAnswer = 0 | 1 | 2 | 3

export type ScreenerId = 'phq9' | 'gad7'

export interface ScreenerOption {
  value: ScreenerAnswer
  label: string
}

export interface ScreenerQuestion {
  /** Stable id — answers are stored against these, so they can never be renumbered. */
  id: string
  text: string
  /**
   * An item where any answer above "Not at all" is a safety signal in its own
   * right, whatever the total comes to. Only PHQ-9 item 9 sets this.
   */
  isRiskItem?: boolean
}

/** How loudly the result should present itself. Never the *only* signal — see `ScoreBand.label`. */
export type BandTone = 'calm' | 'mild' | 'moderate' | 'elevated'

export interface ScoreBand {
  id: string
  /** "Minimal", "Moderate" — the words that carry the result. */
  label: string
  /** Inclusive score range. */
  min: number
  max: number
  /** One sentence naming what the range means, in non-diagnostic language. */
  summary: string
  /** What a person might reasonably do next. Suggestions, never instructions. */
  guidance: string
  tone: BandTone
}

export interface Screener {
  id: ScreenerId
  /** "PHQ-9" — the short name people may recognise from a clinic. */
  name: string
  /** What it is actually called. */
  fullName: string
  /** Plain-language description of what it looks at. */
  about: string
  /** The question stem, shared by every item. */
  stem: string
  /** How long it takes, for the chooser screen. */
  duration: string
  questions: readonly ScreenerQuestion[]
  options: readonly ScreenerOption[]
  bands: readonly ScoreBand[]
  /**
   * The published threshold at which the literature suggests further
   * evaluation. Shown as context, not as a pass/fail line.
   */
  referralCutoff: number
  /** Attribution — the hackathon rules require it and the instruments deserve it. */
  citation: string
  /** Why it is free to reproduce here. */
  licence: string
}

/**
 * The shared frequency scale. Ordered 0 to 3 and rendered in that order, which
 * is the order the instruments are validated in.
 */
const FREQUENCY_OPTIONS: readonly ScreenerOption[] = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
] as const

const SHARED_STEM =
  'Over the last 2 weeks, how often have you been bothered by any of the following problems?'

/* --------------------------------------------------------------------- PHQ-9 */

const PHQ9: Screener = {
  id: 'phq9',
  name: 'PHQ-9',
  fullName: 'Patient Health Questionnaire-9',
  about:
    'Nine questions about low mood, used in clinics around the world to gauge how heavy the last fortnight has been.',
  stem: SHARED_STEM,
  duration: 'About 2 minutes',
  options: FREQUENCY_OPTIONS,
  questions: [
    { id: 'phq9-1', text: 'Little interest or pleasure in doing things' },
    { id: 'phq9-2', text: 'Feeling down, depressed, or hopeless' },
    { id: 'phq9-3', text: 'Trouble falling or staying asleep, or sleeping too much' },
    { id: 'phq9-4', text: 'Feeling tired or having little energy' },
    { id: 'phq9-5', text: 'Poor appetite or overeating' },
    {
      id: 'phq9-6',
      text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
    },
    {
      id: 'phq9-7',
      text: 'Trouble concentrating on things, such as reading the newspaper or watching television',
    },
    {
      id: 'phq9-8',
      text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
    },
    {
      id: 'phq9-9',
      text: 'Thoughts that you would be better off dead or of hurting yourself in some way',
      isRiskItem: true,
    },
  ],
  bands: [
    {
      id: 'minimal',
      label: 'Minimal',
      min: 0,
      max: 4,
      summary: 'Your answers point to little or none of what this questionnaire looks for.',
      guidance:
        'Nothing here needs acting on. Checking in now and then is still a good way to notice a change early.',
      tone: 'calm',
    },
    {
      id: 'mild',
      label: 'Mild',
      min: 5,
      max: 9,
      summary: 'Your answers fall in the mild range for the past fortnight.',
      guidance:
        'Worth keeping an eye on. Small, steady things — sleep, daylight, movement, people you trust — tend to matter more than they sound.',
      tone: 'mild',
    },
    {
      id: 'moderate',
      label: 'Moderate',
      min: 10,
      max: 14,
      summary: 'Your answers fall in the moderate range for the past fortnight.',
      guidance:
        'This is the range where talking to a doctor or therapist is genuinely worth doing. Bringing this score with you is a fine way to start that conversation.',
      tone: 'moderate',
    },
    {
      id: 'moderately-severe',
      label: 'Moderately severe',
      min: 15,
      max: 19,
      summary: 'Your answers fall in the moderately severe range for the past fortnight.',
      guidance:
        'Please consider speaking to a professional soon. You do not have to explain it well or have the right words ready — turning up is enough.',
      tone: 'elevated',
    },
    {
      id: 'severe',
      label: 'Severe',
      min: 20,
      max: 27,
      summary: 'Your answers fall in the severe range for the past fortnight.',
      guidance:
        'That is a lot to be carrying. Please reach out to a doctor or a crisis line — today if you can. You deserve support with this rather than a plan to manage it alone.',
      tone: 'elevated',
    },
  ],
  referralCutoff: 10,
  citation:
    'Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606–613.',
  licence:
    'Developed by Drs Robert L. Spitzer, Janet B.W. Williams and Kurt Kroenke, with an educational grant from Pfizer Inc. No permission is required to reproduce, translate, display or distribute it.',
}

/* --------------------------------------------------------------------- GAD-7 */

const GAD7: Screener = {
  id: 'gad7',
  name: 'GAD-7',
  fullName: 'Generalised Anxiety Disorder-7',
  about:
    'Seven questions about worry and restlessness — the standard first look at anxiety in general practice.',
  stem: SHARED_STEM,
  duration: 'About 90 seconds',
  options: FREQUENCY_OPTIONS,
  questions: [
    { id: 'gad7-1', text: 'Feeling nervous, anxious, or on edge' },
    { id: 'gad7-2', text: 'Not being able to stop or control worrying' },
    { id: 'gad7-3', text: 'Worrying too much about different things' },
    { id: 'gad7-4', text: 'Trouble relaxing' },
    { id: 'gad7-5', text: 'Being so restless that it is hard to sit still' },
    { id: 'gad7-6', text: 'Becoming easily annoyed or irritable' },
    { id: 'gad7-7', text: 'Feeling afraid, as if something awful might happen' },
  ],
  bands: [
    {
      id: 'minimal',
      label: 'Minimal',
      min: 0,
      max: 4,
      summary: 'Your answers point to little or none of what this questionnaire looks for.',
      guidance:
        'Nothing here needs acting on. A breathing session is still a good way to spend four minutes.',
      tone: 'calm',
    },
    {
      id: 'mild',
      label: 'Mild',
      min: 5,
      max: 9,
      summary: 'Your answers fall in the mild range for the past fortnight.',
      guidance:
        'Worth noticing. Grounding and paced breathing genuinely help at this level, and both are a tap away.',
      tone: 'mild',
    },
    {
      id: 'moderate',
      label: 'Moderate',
      min: 10,
      max: 14,
      summary: 'Your answers fall in the moderate range for the past fortnight.',
      guidance:
        'This is the range where talking to a doctor or therapist is genuinely worth doing. Anxiety at this level responds well to treatment.',
      tone: 'moderate',
    },
    {
      id: 'severe',
      label: 'Severe',
      min: 15,
      max: 21,
      summary: 'Your answers fall in the severe range for the past fortnight.',
      guidance:
        'That is exhausting to live with, and it is treatable. Please consider speaking to a professional soon rather than waiting for it to pass.',
      tone: 'elevated',
    },
  ],
  referralCutoff: 10,
  citation:
    'Spitzer RL, Kroenke K, Williams JBW, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092–1097.',
  licence:
    'Developed by Drs Robert L. Spitzer, Janet B.W. Williams and Kurt Kroenke, with an educational grant from Pfizer Inc. No permission is required to reproduce, translate, display or distribute it.',
}

export const SCREENERS: readonly Screener[] = [PHQ9, GAD7] as const

export function getScreener(id: ScreenerId): Screener {
  return SCREENERS.find((screener) => screener.id === id) ?? PHQ9
}

/** The highest total an instrument can reach — 27 for PHQ-9, 21 for GAD-7. */
export function maxScore(screener: Screener): number {
  return screener.questions.length * 3
}

/* -------------------------------------------------------------------- scoring */

export interface ScreenerOutcome {
  score: number
  max: number
  band: ScoreBand
  /**
   * PHQ-9 item 9 answered above "Not at all". Independent of the total: a
   * person can score 3 overall and still have answered yes to this one, and
   * that answer is the more important of the two.
   */
  riskFlagged: boolean
  /** At or above the published threshold for further evaluation. */
  meetsReferralCutoff: boolean
}

/**
 * Sum the answers and place them in a band.
 *
 * Unanswered items count as zero so a partly-filled form still renders
 * something, but callers gate submission on `isComplete` — a total built from
 * skipped questions understates the score, which is the dangerous direction to
 * be wrong in.
 */
export function scoreScreener(
  screener: Screener,
  answers: Readonly<Record<string, ScreenerAnswer>>,
): ScreenerOutcome {
  const score = screener.questions.reduce(
    (total, question) => total + (answers[question.id] ?? 0),
    0,
  )

  const riskFlagged = screener.questions.some(
    (question) => question.isRiskItem === true && (answers[question.id] ?? 0) > 0,
  )

  return {
    score,
    max: maxScore(screener),
    band: bandForScore(screener, score),
    riskFlagged,
    meetsReferralCutoff: score >= screener.referralCutoff,
  }
}

export function bandForScore(screener: Screener, score: number): ScoreBand {
  const match = screener.bands.find((band) => score >= band.min && score <= band.max)
  // Falls back to the top band: if a stored score is somehow out of range, the
  // safe reading is the more serious one, never the calmer one.
  return match ?? screener.bands[screener.bands.length - 1]
}

export function isComplete(
  screener: Screener,
  answers: Readonly<Record<string, ScreenerAnswer>>,
): boolean {
  return screener.questions.every((question) => answers[question.id] !== undefined)
}

/** Which items are still blank, so the form can point at the first one. */
export function unansweredQuestions(
  screener: Screener,
  answers: Readonly<Record<string, ScreenerAnswer>>,
): ScreenerQuestion[] {
  return screener.questions.filter((question) => answers[question.id] === undefined)
}

/* ------------------------------------------------------------------- cadence */

/**
 * Both instruments ask about "the last 2 weeks", so two results a day apart
 * describe almost the same fortnight and their difference is noise. Mindful
 * suggests waiting rather than blocking — someone whose situation has genuinely
 * changed should not be locked out of their own self-check.
 */
export const RETAKE_INTERVAL_DAYS = 14

export function daysBetween(earlierISO: string, laterISO: string): number {
  const earlier = Date.parse(`${earlierISO}T00:00:00`)
  const later = Date.parse(`${laterISO}T00:00:00`)
  if (Number.isNaN(earlier) || Number.isNaN(later)) return Number.POSITIVE_INFINITY
  return Math.round((later - earlier) / 86_400_000)
}

/** Days still to wait before a retake measures a genuinely different fortnight. */
export function daysUntilRetake(lastTakenISO: string, todayISO: string): number {
  return Math.max(0, RETAKE_INTERVAL_DAYS - daysBetween(lastTakenISO, todayISO))
}

/* -------------------------------------------------------------------- change */

export type ScoreDirection = 'first' | 'improved' | 'steady' | 'worsened'

/**
 * How this result compares with the one before it.
 *
 * A 4-point move is the smallest change treated as real. Below that the wording
 * stays at "much the same", because presenting a 1-point drift as improvement
 * would be reading meaning into measurement noise.
 */
export const MEANINGFUL_CHANGE = 4

export function compareScores(current: number, previous: number | null): ScoreDirection {
  if (previous === null) return 'first'
  const delta = current - previous
  if (Math.abs(delta) < MEANINGFUL_CHANGE) return 'steady'
  return delta < 0 ? 'improved' : 'worsened'
}

export function describeChange(direction: ScoreDirection, delta: number): string {
  switch (direction) {
    case 'first':
      return 'This is your first result, so there is nothing to compare it with yet.'
    case 'improved':
      return `Down ${Math.abs(delta)} points since last time — things have eased.`
    case 'worsened':
      return `Up ${Math.abs(delta)} points since last time — the fortnight has been harder.`
    default:
      return 'Much the same as last time.'
  }
}
