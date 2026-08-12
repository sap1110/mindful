/**
 * Crisis routing.
 *
 * Mindful has no idea where the person using it is: there is no network call,
 * no IP lookup, no geolocation prompt, and adding one to "helpfully" localise
 * this list would break the promise the whole app is built on. So the list is
 * static, honest about its coverage, and led by an international directory that
 * works from anywhere — the specific numbers below it are a shortcut for the
 * places they cover, never the whole answer.
 *
 * Ordering is deliberate: the international directory first, then services
 * reachable without a phone call, then national lines. Someone in distress
 * should not have to read to the bottom to find something that applies.
 *
 * These details change. They were checked when written, and `findahelpline.com`
 * is listed first precisely because it is maintained by people whose job that
 * is, while this file is not.
 */

export interface CrisisResource {
  id: string
  name: string
  /** Where it applies, stated plainly — never implied by ordering alone. */
  region: string
  /** What to actually do: dial this, text that. */
  action: string
  /** A `tel:`/`sms:` URI where dialling makes sense, or an https link. */
  href: string
  /** One line on what it is, so the choice is informed. */
  note: string
  /** Opening a phone dialler is a different act from opening a tab — say which. */
  kind: 'directory' | 'text' | 'call'
}

export const CRISIS_RESOURCES: readonly CrisisResource[] = [
  {
    id: 'findahelpline',
    name: 'Find a Helpline',
    region: 'International',
    action: 'findahelpline.com',
    href: 'https://findahelpline.com',
    note: 'Free, vetted helplines in over 130 countries. Start here if nothing below covers where you are.',
    kind: 'directory',
  },
  {
    id: 'befrienders',
    name: 'Befrienders Worldwide',
    region: 'International',
    action: 'befrienders.org',
    href: 'https://www.befrienders.org',
    note: 'A global network of emotional-support centres, searchable by country.',
    kind: 'directory',
  },
  {
    id: 'crisis-text-line',
    name: 'Crisis Text Line',
    region: 'US, UK, Canada, Ireland',
    action: 'Text HOME to 741741',
    href: 'sms:741741?&body=HOME',
    note: 'Trained volunteers over text, at any hour, if speaking aloud is too much right now.',
    kind: 'text',
  },
  {
    id: 'lifeline-988',
    name: '988 Suicide & Crisis Lifeline',
    region: 'United States & Canada',
    action: 'Call or text 988',
    href: 'tel:988',
    note: 'Free and confidential, 24 hours a day. You do not have to be suicidal to call.',
    kind: 'call',
  },
  {
    id: 'samaritans',
    name: 'Samaritans',
    region: 'United Kingdom & Ireland',
    action: 'Call 116 123',
    href: 'tel:116123',
    note: 'Free from any phone, day or night. They will not tell you what to do or hurry you.',
    kind: 'call',
  },
  {
    id: 'lifeline-au',
    name: 'Lifeline',
    region: 'Australia',
    action: 'Call 13 11 14',
    href: 'tel:131114',
    note: 'Crisis support and suicide prevention, 24 hours a day.',
    kind: 'call',
  },
] as const

/**
 * The line that comes before every list of the above. Emergency services first,
 * because a helpline is the right call for distress and the wrong one for
 * immediate danger.
 */
export const EMERGENCY_NOTE =
  'If you are in immediate danger, call your local emergency number — 911, 999, 112, or whatever it is where you are.'

export const HELPLINE_DIRECTORY_URL = 'https://findahelpline.com'
