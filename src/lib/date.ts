/**
 * Calendar helpers.
 *
 * Everything Mindful stores is keyed by *local* calendar day, never UTC: a
 * check-in at 11pm belongs to the day the person is living in, not to
 * tomorrow because their timezone is ahead of Greenwich. `toISODate` is
 * therefore built from the local getters rather than `toISOString`.
 */

const LOCALE = 'en-GB'

/** `YYYY-MM-DD` for the given date, in the device's own timezone. */
export function toISODate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Parse a `YYYY-MM-DD` day into a local Date at midnight. */
export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** The last `count` days ending today, oldest first. */
export function lastDays(count: number, endingOn: string = todayISO()): string[] {
  return Array.from({ length: count }, (_, index) => addDays(endingOn, index - (count - 1)))
}

/** "Tuesday, 11 August" — the check-in screen's subheading. */
export function formatLongDay(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(fromISODate(iso))
}

/** "Mon 10 Aug" — compact enough for a list row. */
export function formatShortDay(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(fromISODate(iso))
}

/** "Mon" — the axis label under a history bar. */
export function formatWeekday(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }).format(fromISODate(iso))
}

/** "4:12 pm" from a full ISO timestamp. */
export function formatTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true })
    .format(date)
    .toLowerCase()
}

/**
 * "Today" / "Yesterday" / "Mon 10 Aug". Naming the near days makes a list of
 * entries readable at a glance without doing date arithmetic in your head.
 */
export function describeDay(iso: string, today: string = todayISO()): string {
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
  return formatShortDay(iso)
}

/** Whole minutes and seconds, e.g. "3 min 20 sec" — used for session summaries. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) return `${seconds} sec`
  if (seconds === 0) return `${minutes} min`
  return `${minutes} min ${seconds} sec`
}
