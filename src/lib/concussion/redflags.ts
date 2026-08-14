/**
 * The danger signs, which come before everything else on the screen.
 *
 * This is the one part of the recovery feature that is not about tracking or
 * pacing. A concussion can be accompanied by a bleed that gets worse over
 * hours, and the difference between a headache that is part of recovery and
 * one that is an emergency is a list of specific signs that most people have
 * never been shown. So the list is shown unprompted, at the top, on every
 * visit — not behind a button, not after a questionnaire, and not conditional
 * on how someone answered anything.
 *
 * The list is the CDC's HEADS UP danger signs, which is written for the public
 * rather than for clinicians. That matters: the SCAT is a professional
 * instrument and reproducing it as a self-service quiz would be the wrong tool
 * aimed at the wrong person. Recognition guidance is for everybody, and this
 * is the recognition guidance.
 *
 * There is deliberately no scoring here and no "your risk is low" anywhere.
 * One sign is enough, the app never weighs them up, and the only output is the
 * same instruction the CDC gives: get emergency care.
 */

export interface DangerSign {
  id: string
  /** Written the way someone would notice it, not the way it is charted. */
  text: string
}

/** CDC HEADS UP danger signs. Any one of these means emergency care now. */
export const DANGER_SIGNS: readonly DangerSign[] = [
  { id: 'headache', text: 'A headache that keeps getting worse and will not go away' },
  { id: 'weakness', text: 'Weakness, numbness, or less coordination than usual' },
  { id: 'speech', text: 'Slurred speech' },
  { id: 'vomiting', text: 'Repeated nausea or vomiting' },
  { id: 'pupils', text: 'One pupil larger than the other, or double vision' },
  { id: 'seizure', text: 'Convulsions or seizures — shaking or twitching' },
  {
    id: 'consciousness',
    text: 'Getting more drowsy, hard to wake up, or unable to stay awake',
  },
  { id: 'recognition', text: 'Not able to recognise people or places' },
  {
    id: 'behaviour',
    text: 'Unusual behaviour, increasing confusion, restlessness, or agitation',
  },
  { id: 'neck', text: 'Neck pain or tenderness after the injury' },
]

/** For a baby or toddler, on top of everything above. */
export const INFANT_DANGER_SIGNS: readonly string[] = [
  'Will not stop crying and cannot be consoled',
  'Will not feed or nurse',
]

export const EMERGENCY_ACTION =
  'Call your local emergency number or go to an emergency department now. Do not drive yourself.'

/**
 * The rule for the day of the injury, which is not negotiable and not a
 * judgement call anyone at the side of a pitch should be asked to make.
 */
export const SAME_DAY_RULE =
  'Anyone with a suspected concussion should stop playing immediately and must not return to sport on the same day — even if they feel fine within minutes. If in doubt, sit them out.'
