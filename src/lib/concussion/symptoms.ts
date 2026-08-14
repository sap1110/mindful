/**
 * The symptom check: 22 symptoms, each rated 0 to 6.
 *
 * This is the symptom evaluation used in concussion care and research — the
 * post-concussion symptom scale that appears inside the SCAT — and it is here
 * for one job: producing a record over time that means something to a
 * clinician. A single score on a single day is close to useless. The same 22
 * items rated daily for three weeks is the thing that shows whether someone is
 * recovering, plateauing, or getting worse, and it is exactly the thing people
 * cannot reconstruct from memory in a ten-minute appointment.
 *
 * What it is not, stated here because the code is where the temptation lives:
 * it is not a diagnosis, not a severity grade, and not a clearance test. A
 * total of zero does not mean recovered — symptoms can be absent at rest and
 * appear on exertion, which is why the protocol in `protocol.ts` is paced by
 * time and tolerance rather than by this number. Nothing in this app changes
 * behaviour based on the total except to suggest talking to someone.
 *
 * The 0-6 anchors are the standard ones (0 none, 1-2 mild, 3-4 moderate, 5-6
 * severe). The symptom wording is the plain clinical description of each
 * symptom; the SCAT itself is the Concussion in Sport Group's instrument and
 * is not reproduced here.
 */

export type SymptomDomain = 'physical' | 'cognitive' | 'emotional' | 'sleep'

export interface ConcussionSymptom {
  id: string
  label: string
  domain: SymptomDomain
}

/**
 * The 22 items, grouped by domain.
 *
 * Domains are not scored separately — the validated total is the sum of all 22
 * — but they are how the results are read back, because "your thinking
 * symptoms have not moved while the headaches have" is the kind of thing worth
 * noticing, and a single number out of 132 hides it.
 */
export const CONCUSSION_SYMPTOMS: readonly ConcussionSymptom[] = [
  { id: 'headache', label: 'Headache', domain: 'physical' },
  { id: 'pressure', label: '“Pressure in head”', domain: 'physical' },
  { id: 'neck-pain', label: 'Neck pain', domain: 'physical' },
  { id: 'nausea', label: 'Nausea or vomiting', domain: 'physical' },
  { id: 'dizziness', label: 'Dizziness', domain: 'physical' },
  { id: 'blurred-vision', label: 'Blurred vision', domain: 'physical' },
  { id: 'balance', label: 'Balance problems', domain: 'physical' },
  { id: 'light', label: 'Sensitivity to light', domain: 'physical' },
  { id: 'noise', label: 'Sensitivity to noise', domain: 'physical' },
  { id: 'slowed', label: 'Feeling slowed down', domain: 'cognitive' },
  { id: 'fog', label: 'Feeling like “in a fog”', domain: 'cognitive' },
  { id: 'not-right', label: '“Don’t feel right”', domain: 'cognitive' },
  { id: 'concentration', label: 'Difficulty concentrating', domain: 'cognitive' },
  { id: 'memory', label: 'Difficulty remembering', domain: 'cognitive' },
  { id: 'fatigue', label: 'Fatigue or low energy', domain: 'physical' },
  { id: 'confusion', label: 'Confusion', domain: 'cognitive' },
  { id: 'drowsiness', label: 'Drowsiness', domain: 'sleep' },
  { id: 'emotional', label: 'More emotional than usual', domain: 'emotional' },
  { id: 'irritability', label: 'Irritability', domain: 'emotional' },
  { id: 'sadness', label: 'Sadness', domain: 'emotional' },
  { id: 'nervous', label: 'Nervous or anxious', domain: 'emotional' },
  { id: 'sleep', label: 'Trouble falling asleep', domain: 'sleep' },
]

export const MAX_SYMPTOM_RATING = 6
export const MAX_TOTAL_SEVERITY = CONCUSSION_SYMPTOMS.length * MAX_SYMPTOM_RATING

/** The 0-6 anchors, shown next to the scale rather than left to guesswork. */
export const RATING_ANCHORS: readonly { value: number; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Mild' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Moderate' },
  { value: 5, label: 'Severe' },
  { value: 6, label: 'Severe' },
]

export interface SymptomScore {
  /** Sum of all 22 ratings, 0-132. The figure clinicians track. */
  severity: number
  /** How many of the 22 are present at all, 0-22. Tracked alongside severity. */
  count: number
  byDomain: Record<SymptomDomain, number>
}

export function scoreSymptoms(answers: Record<string, number>): SymptomScore {
  const byDomain: Record<SymptomDomain, number> = {
    physical: 0,
    cognitive: 0,
    emotional: 0,
    sleep: 0,
  }

  let severity = 0
  let count = 0

  for (const symptom of CONCUSSION_SYMPTOMS) {
    const rating = clampRating(answers[symptom.id] ?? 0)
    severity += rating
    if (rating > 0) count += 1
    byDomain[symptom.domain] += rating
  }

  return { severity, count, byDomain }
}

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_SYMPTOM_RATING, Math.max(0, Math.round(value)))
}

/**
 * The change since last time, described without a verdict.
 *
 * Deliberately not banded into "mild / moderate / severe". Symptom totals are
 * not a severity grade and treating them as one invites someone to decide they
 * are fine on the strength of a number. Direction over time is what the record
 * is for; the reading of it belongs to a clinician.
 */
export function describeChange(current: number, previous: number | null): string {
  if (previous === null) return 'This is your first check, so there is nothing to compare it against yet.'

  const delta = current - previous
  if (delta === 0) return 'Your total is the same as your last check.'
  if (delta < 0) return `Your total is ${Math.abs(delta)} lower than your last check.`
  return `Your total is ${delta} higher than your last check.`
}

/**
 * When to say something rather than nothing.
 *
 * Two triggers, both about trajectory rather than level: a total that is
 * climbing, and symptoms still present a month on. Neither is an alarm — they
 * produce a sentence suggesting a conversation, which is the most this feature
 * is entitled to do.
 */
export const WORSENING_THRESHOLD = 10
export const PERSISTING_DAYS = 28

export interface SymptomAdvice {
  worsening: boolean
  persisting: boolean
}

export function reviewTrend(
  history: readonly { severity: number; date: string }[],
  today: string,
): SymptomAdvice {
  if (history.length === 0) return { worsening: false, persisting: false }

  const [latest] = history
  const previous = history[1]

  const worsening =
    previous !== undefined && latest.severity - previous.severity >= WORSENING_THRESHOLD

  const oldest = history[history.length - 1]
  const daysSinceFirst = daysBetween(oldest.date, today)
  const persisting = daysSinceFirst >= PERSISTING_DAYS && latest.severity > 0

  return { worsening, persisting }
}

/** Whole days between two `YYYY-MM-DD` dates, local time. */
export function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T00:00:00`).getTime()
  return Math.round((end - start) / 86_400_000)
}
