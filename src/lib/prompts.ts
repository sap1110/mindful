import { fromISODate } from './date'

/**
 * Journal prompts.
 *
 * Open questions, never instructions, and nothing that asks someone to rate,
 * score or improve themselves. The prompt is always optional: the composer
 * works exactly the same if you dismiss it.
 */
export const JOURNAL_PROMPTS: readonly string[] = [
  'What is one thing that went better than you expected today?',
  'What has been taking up the most room in your head lately?',
  'Where did you notice your body relax, even briefly?',
  'What would you say to a friend in your exact situation right now?',
  'What is something small you are looking forward to?',
  'What did today ask of you, and what did it give back?',
  'Is there something you have been carrying that you could put down?',
  'Who or what made today a little easier?',
  'What is true right now that was not true a month ago?',
  'If today had a weather forecast, what would it be?',
  'What have you been avoiding, and what is one gentle first step?',
  'What did you notice today that you would usually walk past?',
  'What are you tired of pretending is fine?',
  'When did you feel most like yourself this week?',
  'What is one kind thing you could do for tomorrow-you?',
] as const

/**
 * The prompt for a given day.
 *
 * Deterministic on the calendar date — the same day always shows the same
 * prompt, across reloads and across tabs — but it walks the list rather than
 * repeating, so it changes at midnight without any stored state.
 */
export function promptForDate(iso: string): string {
  const days = Math.floor(fromISODate(iso).getTime() / 86_400_000)
  const index = ((days % JOURNAL_PROMPTS.length) + JOURNAL_PROMPTS.length) % JOURNAL_PROMPTS.length
  return JOURNAL_PROMPTS[index]
}
