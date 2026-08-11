import { addDays, todayISO } from './date'
import { MOOD_TAGS } from './mood'
import { promptForDate } from './prompts'
import {
  createId,
  insertRecords,
  readMoodEntries,
  readSampleIds,
  removeRecords,
  writeSampleIds,
  type BreathingSession,
  type JournalEntry,
  type MoodEntry,
  type MoodScore,
} from './storage'

/**
 * Sample data for demos.
 *
 * A judge opening a fresh install would otherwise see three empty screens,
 * which undersells the app. This seeds a plausible month, marks every record
 * it created so the toggle can take exactly those back out again, and never
 * touches a real entry: days the person has already logged are skipped.
 *
 * It is labelled as sample data everywhere it shows up, and `eraseAll` removes
 * it along with everything else.
 */

const SAMPLE_DAYS = 30

/** Deterministic PRNG, so the demo looks the same every time it is shown. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A gentle upward drift with ordinary bad days in it — not a success story. */
const SCORE_SHAPE: readonly MoodScore[] = [
  3, 2, 3, 4, 2, 3, 3, 4, 3, 1, 2, 3, 4, 4, 3, 3, 5, 4, 2, 3, 4, 4, 3, 5, 4, 3, 4, 5, 4, 4,
]

const NOTES: readonly string[] = [
  'Slept badly, so everything felt louder than it was.',
  'Walked to the shops the long way. Helped more than I expected.',
  'Busy day, but I did not skip lunch for once.',
  'Nothing much happened, which was fine.',
  'A hard morning and a much easier afternoon.',
  'Called mum. Long overdue.',
]

const JOURNAL_BODIES: readonly string[] = [
  'Got through standup without the usual knot in my chest. Small thing, but I noticed it, and noticing it seems to be half of the work.\n\nStill tired. Going to stop pretending that is a scheduling problem.',
  'Long walk by the water this evening. Did not think about work once, which felt like cheating somehow. Trying to let that be allowed.',
  'Slept badly again. Writing it down so I stop telling myself it is a one-off. Third time this week.',
  'Someone asked how I was and I answered honestly instead of saying fine. It was awkward for about four seconds and then it was not.',
  'Made a list of what is actually mine to fix and what I have just been carrying for other people. The second list was longer.',
  'Quiet day. Read for an hour with my phone in another room. I should do that more, but I am not going to make a rule about it.',
  'Anxious most of the morning with no obvious reason, and by three it had lifted. Useful to see it pass on its own.',
  'Cooked properly instead of eating standing up. It is a low bar and I am still counting it.',
]

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]
}

function buildSample(today: string): {
  moods: MoodEntry[]
  journal: JournalEntry[]
  breathing: BreathingSession[]
} {
  const random = mulberry32(20260811)
  const moods: MoodEntry[] = []
  const journal: JournalEntry[] = []
  const breathing: BreathingSession[] = []

  for (let offset = SAMPLE_DAYS - 1; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset)
    const dayIndex = SAMPLE_DAYS - 1 - offset

    // A couple of skipped days, because nobody checks in every single day.
    if (dayIndex === 6 || dayIndex === 19) continue

    const score = SCORE_SHAPE[dayIndex % SCORE_SHAPE.length]
    const tagCount = random() < 0.25 ? 0 : random() < 0.7 ? 1 : 2
    const tags: string[] = []
    while (tags.length < tagCount) {
      const tag = pick(MOOD_TAGS, random).id
      if (!tags.includes(tag)) tags.push(tag)
    }

    const stamp = `${date}T19:${String(10 + (dayIndex % 45)).padStart(2, '0')}:00.000Z`

    moods.push({
      id: createId('mood'),
      date,
      score,
      tags,
      note: random() < 0.4 ? pick(NOTES, random) : undefined,
      createdAt: stamp,
      updatedAt: stamp,
    })

    if (dayIndex % 4 === 1 && journal.length < JOURNAL_BODIES.length) {
      const body = JOURNAL_BODIES[journal.length]
      const written = `${date}T20:${String(5 + (dayIndex % 50)).padStart(2, '0')}:00.000Z`
      journal.push({
        id: createId('jrnl'),
        date,
        body,
        prompt: journal.length % 2 === 0 ? promptForDate(date) : undefined,
        createdAt: written,
        updatedAt: written,
      })
    }

    if (dayIndex % 5 === 2) {
      breathing.push({
        id: createId('brth'),
        patternId: dayIndex % 10 === 2 ? 'calming' : 'box',
        completedCycles: 4 + (dayIndex % 5),
        durationMs: (60 + (dayIndex % 4) * 60) * 1000,
        completedAt: `${date}T07:${String(20 + (dayIndex % 30)).padStart(2, '0')}:00.000Z`,
      })
    }
  }

  return { moods, journal, breathing }
}

/** Seed the demo month. Existing check-ins are left exactly as they are. */
export function loadSampleData(): void {
  const today = todayISO()
  const sample = buildSample(today)

  const taken = new Set(readMoodEntries().map((entry) => entry.date))
  const moods = sample.moods.filter((entry) => !taken.has(entry.date))

  insertRecords({ moods, journal: sample.journal, breathing: sample.breathing })

  const ids = [
    ...moods.map((entry) => entry.id),
    ...sample.journal.map((entry) => entry.id),
    ...sample.breathing.map((session) => session.id),
  ]
  writeSampleIds([...readSampleIds(), ...ids])
}

/** Take the demo month back out, leaving anything the person wrote themselves. */
export function removeSampleData(): void {
  removeRecords(readSampleIds())
  writeSampleIds([])
}

export function isSampleId(id: string, sampleIds: readonly string[]): boolean {
  return sampleIds.includes(id)
}
