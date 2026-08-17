import type { ScreenerId } from './screener'

/**
 * On-device storage for everything Mindful records.
 *
 * The whole app is a localStorage app: no backend, no account, no network
 * calls, no analytics. That is a promise made to the person using it on the
 * landing screen, so it is enforced here — this module is the *only* place in
 * the codebase that touches `window.localStorage` for feature data (the
 * onboarding profile keeps its own older key in `lib/profile.ts`).
 *
 * Everything is namespaced under `mindful.v1.*` and stamped with a schema
 * version, so a later shape change is a migration rather than a data loss.
 * Reads are total: corrupt, half-written or foreign data parses to empty
 * state instead of throwing a white screen at someone mid-check-in.
 */

/* ------------------------------------------------------------------ keys */

/** Every key this app owns starts with this. `eraseAll` sweeps on the prefix. */
export const STORAGE_NAMESPACE = 'mindful.'

export const SCHEMA_VERSION = 1

export const STORAGE_KEYS = {
  schema: 'mindful.v1.schema',
  moods: 'mindful.v1.moods',
  journal: 'mindful.v1.journal',
  breathing: 'mindful.v1.breathing',
  screeners: 'mindful.v1.screeners',
  /** The in-progress journal entry, autosaved as you type. */
  draft: 'mindful.v1.journal.draft',
  /** Ids of records seeded by the sample-data toggle, so it can be undone exactly. */
  sample: 'mindful.v1.sample',
  /** The day whose journal prompt was dismissed, so it stays dismissed. */
  promptDismissed: 'mindful.v1.journal.promptDismissed',
  /** How the spoken breathing guide is set up on *this* device. */
  voice: 'mindful.v1.breathing.voice',
  /** Daily concussion symptom checks. */
  concussion: 'mindful.v1.concussion.checks',
  /** Where someone is on the graduated return-to-learn/sport ladder. */
  concussionProtocol: 'mindful.v1.concussion.protocol',
  /** The guided tour has been offered on this device — see `readTourSeen`. */
  tourSeen: 'mindful.v1.tour.seen',
} as const

/* ----------------------------------------------------------------- types */

/** 1 rough · 2 low · 3 okay · 4 good · 5 great. */
export type MoodScore = 1 | 2 | 3 | 4 | 5

export interface MoodEntry {
  id: string
  /** Local calendar day, `YYYY-MM-DD`. One entry per day, editable all day. */
  date: string
  score: MoodScore
  tags: string[]
  note?: string
  createdAt: string
  updatedAt: string
}

export interface JournalEntry {
  id: string
  /** Local calendar day the entry was started on, `YYYY-MM-DD`. */
  date: string
  body: string
  /** The prompt that was on screen when it was written, if one was used. */
  prompt?: string
  createdAt: string
  updatedAt: string
}

export interface BreathingSession {
  id: string
  patternId: string
  completedCycles: number
  durationMs: number
  completedAt: string
}

export interface JournalDraft {
  body: string
  prompt?: string
  updatedAt: string
}

/**
 * One completed run of a validated self-check.
 *
 * The per-item `answers` are kept, not just the total, because a total alone
 * cannot answer "was that the sleep question or the hopelessness question" when
 * someone looks back — and because `riskFlagged` has to stay reconstructible
 * rather than being a bare boolean we hope was written correctly.
 *
 * Unlike a mood check-in these are never edited: a result is a record of what
 * was answered on a day, so a retake is a new record and the old one stands.
 */
export interface ScreenerResult {
  id: string
  screenerId: ScreenerId
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string
  score: number
  /** The `ScoreBand.id` the score fell in when it was taken. */
  bandId: string
  /** Answers keyed by question id, each 0-3. */
  answers: Record<string, number>
  /** PHQ-9 item 9 was answered above "Not at all". */
  riskFlagged: boolean
  createdAt: string
}

/**
 * One day's concussion symptom check.
 *
 * Kept per item rather than as a total, for the same reason screener answers
 * are: a clinician looking at three weeks of these needs to see that the
 * headaches settled while the concentration did not, and a single number out
 * of 132 cannot show that. Unlike a mood check-in, a later check on the same
 * day replaces the earlier one — the question is "how are you now".
 */
export interface SymptomCheck {
  id: string
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string
  /** Ratings keyed by symptom id, each 0-6. */
  answers: Record<string, number>
  /** Sum of all 22 ratings, 0-132. Stored so history reads without rescoring. */
  severity: number
  /** How many symptoms were present at all, 0-22. */
  count: number
  createdAt: string
}

export interface MindfulData {
  moods: MoodEntry[]
  journal: JournalEntry[]
  breathing: BreathingSession[]
  screeners: ScreenerResult[]
  concussion: SymptomCheck[]
}

export interface ExportBundle extends MindfulData {
  schemaVersion: number
  exportedAt: string
  app: 'mindful'
  /**
   * Where the person is on the concussion return ladder, if they are on one.
   * Part of the export because this file is the thing to hand a clinician, and
   * "which stage, since when" is the first question they will ask.
   */
  concussionProtocol: StoredProtocol | null
}

const EMPTY: MindfulData = {
  moods: [],
  journal: [],
  breathing: [],
  screeners: [],
  concussion: [],
}

/* ------------------------------------------------------------- primitives */

/**
 * localStorage can throw on access alone (Safari private browsing, embedded
 * webviews with storage disabled). Every entry point goes through these two,
 * so a blocked-storage browser degrades to a working in-memory session.
 */
function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* Out of quota or storage disabled — the session still works. */
  }
}

function removeRaw(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* no-op */
  }
}

/** Parse a JSON array of records, dropping anything that fails its guard. */
function readList<T>(key: string, isValid: (value: unknown) => value is T): T[] {
  const raw = readRaw(key)
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []
  return parsed.filter(isValid)
}

function writeList<T>(key: string, value: T[]): void {
  writeRaw(key, JSON.stringify(value))
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

const isIsoDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

/* ------------------------------------------------------------------ guards */

function isMoodEntry(value: unknown): value is MoodEntry {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isIsoDay(value.date)) return false
  if (typeof value.score !== 'number' || !Number.isInteger(value.score)) return false
  if (value.score < 1 || value.score > 5) return false
  if (!Array.isArray(value.tags) || !value.tags.every((tag) => typeof tag === 'string')) return false
  if (value.note !== undefined && typeof value.note !== 'string') return false
  return isNonEmptyString(value.createdAt) && isNonEmptyString(value.updatedAt)
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isIsoDay(value.date)) return false
  if (typeof value.body !== 'string') return false
  if (value.prompt !== undefined && typeof value.prompt !== 'string') return false
  return isNonEmptyString(value.createdAt) && isNonEmptyString(value.updatedAt)
}

function isBreathingSession(value: unknown): value is BreathingSession {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.patternId)) return false
  if (typeof value.completedCycles !== 'number' || typeof value.durationMs !== 'number') return false
  return isNonEmptyString(value.completedAt)
}

function isSymptomCheck(value: unknown): value is SymptomCheck {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isIsoDay(value.date)) return false
  if (typeof value.severity !== 'number' || typeof value.count !== 'number') return false
  if (!isRecord(value.answers)) return false
  if (!Object.values(value.answers).every((answer) => typeof answer === 'number')) return false
  return isNonEmptyString(value.createdAt)
}

function isScreenerResult(value: unknown): value is ScreenerResult {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isIsoDay(value.date)) return false
  if (value.screenerId !== 'phq9' && value.screenerId !== 'gad7') return false
  if (typeof value.score !== 'number' || !Number.isInteger(value.score) || value.score < 0) {
    return false
  }
  if (!isNonEmptyString(value.bandId)) return false
  if (typeof value.riskFlagged !== 'boolean') return false
  if (!isRecord(value.answers)) return false
  if (!Object.values(value.answers).every((answer) => typeof answer === 'number')) return false
  return isNonEmptyString(value.createdAt)
}

/* ------------------------------------------------------------------ ids */

let idCounter = 0

/**
 * A collision-resistant id without pulling in a uuid dependency.
 * `crypto.randomUUID` where it exists, a timestamped counter where it does not.
 */
export function createId(prefix = 'm'): string {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : undefined
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return `${prefix}_${globalCrypto.randomUUID()}`
  }
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`
}

/* ----------------------------------------------------------------- reads */

export function readMoodEntries(): MoodEntry[] {
  return readList(STORAGE_KEYS.moods, isMoodEntry).sort((a, b) => b.date.localeCompare(a.date))
}

export function readJournalEntries(): JournalEntry[] {
  return readList(STORAGE_KEYS.journal, isJournalEntry).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

export function readBreathingSessions(): BreathingSession[] {
  return readList(STORAGE_KEYS.breathing, isBreathingSession).sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )
}

export function readScreenerResults(): ScreenerResult[] {
  return readList(STORAGE_KEYS.screeners, isScreenerResult).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
}

export function readSymptomChecks(): SymptomCheck[] {
  return readList(STORAGE_KEYS.concussion, isSymptomCheck).sort((a, b) =>
    b.date.localeCompare(a.date),
  )
}

/** The whole on-device dataset, newest first in each collection. */
export function readAll(): MindfulData {
  return {
    moods: readMoodEntries(),
    journal: readJournalEntries(),
    breathing: readBreathingSessions(),
    screeners: readScreenerResults(),
    concussion: readSymptomChecks(),
  }
}

/* ------------------------------------------------------- reactive snapshot */

const listeners = new Set<() => void>()
let snapshot: MindfulData = EMPTY
let sampleSnapshot: string[] = []
let hydrated = false

function refresh(): void {
  snapshot = readAll()
  sampleSnapshot = readSampleIds()
  hydrated = true
}

function emit(): void {
  refresh()
  for (const listener of listeners) listener()
}

/**
 * `useSyncExternalStore` contract: a stable snapshot object that only changes
 * identity when the data actually changed, so React does not re-render forever.
 */
export function getSnapshot(): MindfulData {
  if (!hydrated) refresh()
  return snapshot
}

/** Companion snapshot: which records came from the sample-data toggle. */
export function getSampleIdsSnapshot(): string[] {
  if (!hydrated) refresh()
  return sampleSnapshot
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  // Another tab writing our keys should update this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(STORAGE_NAMESPACE)) emit()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function stampSchema(): void {
  writeRaw(STORAGE_KEYS.schema, String(SCHEMA_VERSION))
}

/* -------------------------------------------------------------- mood API */

export function findMoodEntry(date: string): MoodEntry | undefined {
  return readMoodEntries().find((entry) => entry.date === date)
}

export interface MoodInput {
  date: string
  score: MoodScore
  tags: string[]
  note?: string
}

/**
 * One check-in per calendar day. Saving again on the same day updates the
 * existing record rather than stacking a second one.
 */
export function saveMoodEntry(input: MoodInput): MoodEntry {
  const now = new Date().toISOString()
  const entries = readMoodEntries()
  const existing = entries.find((entry) => entry.date === input.date)

  const note = input.note?.trim() ? input.note.trim() : undefined

  const entry: MoodEntry = existing
    ? { ...existing, score: input.score, tags: [...input.tags], note, updatedAt: now }
    : {
        id: createId('mood'),
        date: input.date,
        score: input.score,
        tags: [...input.tags],
        note,
        createdAt: now,
        updatedAt: now,
      }

  const next = [entry, ...entries.filter((candidate) => candidate.date !== input.date)]
  writeList(STORAGE_KEYS.moods, next)
  stampSchema()
  emit()
  return entry
}

export function deleteMoodEntry(date: string): void {
  writeList(
    STORAGE_KEYS.moods,
    readMoodEntries().filter((entry) => entry.date !== date),
  )
  emit()
}

/* ----------------------------------------------------------- journal API */

export interface JournalInput {
  date: string
  body: string
  prompt?: string
}

export function addJournalEntry(input: JournalInput): JournalEntry {
  const now = new Date().toISOString()
  const entry: JournalEntry = {
    id: createId('jrnl'),
    date: input.date,
    body: input.body.trim(),
    prompt: input.prompt,
    createdAt: now,
    updatedAt: now,
  }

  writeList(STORAGE_KEYS.journal, [entry, ...readJournalEntries()])
  stampSchema()
  emit()
  return entry
}

export function updateJournalEntry(id: string, body: string): void {
  const now = new Date().toISOString()
  writeList(
    STORAGE_KEYS.journal,
    readJournalEntries().map((entry) =>
      entry.id === id ? { ...entry, body: body.trim(), updatedAt: now } : entry,
    ),
  )
  emit()
}

export function deleteJournalEntry(id: string): void {
  writeList(
    STORAGE_KEYS.journal,
    readJournalEntries().filter((entry) => entry.id !== id),
  )
  emit()
}

/* ------------------------------------------------------------- draft API */

/** Autosaved composer content, so a closed tab never loses what was typed. */
export function readDraft(): JournalDraft | null {
  const raw = readRaw(STORAGE_KEYS.draft)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || typeof parsed.body !== 'string') return null
    return {
      body: parsed.body,
      prompt: typeof parsed.prompt === 'string' ? parsed.prompt : undefined,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveDraft(draft: { body: string; prompt?: string }): void {
  if (!draft.body) {
    clearDraft()
    return
  }
  writeRaw(
    STORAGE_KEYS.draft,
    JSON.stringify({ ...draft, updatedAt: new Date().toISOString() } satisfies JournalDraft),
  )
}

export function clearDraft(): void {
  removeRaw(STORAGE_KEYS.draft)
}

/** Was today's prompt waved away? Dismissal only lasts for the day it was made. */
export function isPromptDismissed(date: string): boolean {
  return readRaw(STORAGE_KEYS.promptDismissed) === date
}

export function dismissPrompt(date: string): void {
  writeRaw(STORAGE_KEYS.promptDismissed, date)
}

/* ----------------------------------------------------------- breathing API */

export interface BreathingInput {
  patternId: string
  completedCycles: number
  durationMs: number
}

export function recordBreathingSession(input: BreathingInput): BreathingSession {
  const session: BreathingSession = {
    id: createId('brth'),
    patternId: input.patternId,
    completedCycles: input.completedCycles,
    durationMs: Math.round(input.durationMs),
    completedAt: new Date().toISOString(),
  }

  writeList(STORAGE_KEYS.breathing, [session, ...readBreathingSessions()])
  stampSchema()
  emit()
  return session
}

/* ------------------------------------------------------- voice guide prefs */

/**
 * How the spoken guide is set up. Deliberately *not* part of the export
 * bundle: a voice id names a voice installed on this particular machine, so
 * carrying it to another one would restore a preference that cannot be met.
 */
export interface VoicePrefs {
  enabled: boolean
  /** The chosen platform voice, or null for "whichever this device suggests". */
  voiceId: string | null
  /** Dim the screen and hand the whole session over to the voice. */
  eyesClosed: boolean
  /**
   * The safety checks for breathing with your eyes shut have been read and
   * confirmed on this device. Asked once: a confirmation shown every single
   * time is one people learn to dismiss without reading.
   */
  eyesClosedAcknowledged: boolean
}

export const DEFAULT_VOICE_PREFS: VoicePrefs = {
  enabled: false,
  voiceId: null,
  eyesClosed: false,
  eyesClosedAcknowledged: false,
}

export function readVoicePrefs(): VoicePrefs {
  const raw = readRaw(STORAGE_KEYS.voice)
  if (!raw) return DEFAULT_VOICE_PREFS

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return DEFAULT_VOICE_PREFS
    return {
      enabled: parsed.enabled === true,
      voiceId: typeof parsed.voiceId === 'string' ? parsed.voiceId : null,
      eyesClosed: parsed.eyesClosed === true,
      eyesClosedAcknowledged: parsed.eyesClosedAcknowledged === true,
    }
  } catch {
    return DEFAULT_VOICE_PREFS
  }
}

export function saveVoicePrefs(prefs: VoicePrefs): void {
  writeRaw(STORAGE_KEYS.voice, JSON.stringify(prefs))
}

/* ----------------------------------------------------------- screener API */

export interface ScreenerInput {
  screenerId: ScreenerId
  date: string
  score: number
  bandId: string
  answers: Record<string, number>
  riskFlagged: boolean
}

/**
 * Append a completed self-check. Always an insert — see `ScreenerResult` for
 * why results are never edited in place.
 */
export function saveScreenerResult(input: ScreenerInput): ScreenerResult {
  const result: ScreenerResult = {
    id: createId('scrn'),
    screenerId: input.screenerId,
    date: input.date,
    score: input.score,
    bandId: input.bandId,
    answers: { ...input.answers },
    riskFlagged: input.riskFlagged,
    createdAt: new Date().toISOString(),
  }

  writeList(STORAGE_KEYS.screeners, [result, ...readScreenerResults()])
  stampSchema()
  emit()
  return result
}

/* --------------------------------------------------------- concussion API */

export interface SymptomCheckInput {
  date: string
  answers: Record<string, number>
  severity: number
  count: number
}

/**
 * Record a symptom check. One per day, replaced if it is taken again — a
 * screener result is a record of what was answered on a day, but a symptom
 * check answers "how are you now", and the later answer is the true one.
 */
export function saveSymptomCheck(input: SymptomCheckInput): SymptomCheck {
  const existing = readSymptomChecks()
  const check: SymptomCheck = {
    id: existing.find((entry) => entry.date === input.date)?.id ?? createId('conc'),
    date: input.date,
    answers: { ...input.answers },
    severity: input.severity,
    count: input.count,
    createdAt: new Date().toISOString(),
  }

  writeList(STORAGE_KEYS.concussion, [
    check,
    ...existing.filter((entry) => entry.date !== input.date),
  ])
  stampSchema()
  emit()
  return check
}

/**
 * Where someone is on the return-to-learn or return-to-sport ladder.
 *
 * Stored as one record rather than a list: it is a position, not a history.
 * Read defensively — a half-written or hand-edited value must not be able to
 * put someone at stage 6 with a clearance they never got, so anything that
 * fails its guard reads as "no protocol started".
 */
export interface StoredProtocol {
  track: 'learn' | 'sport'
  stage: number
  startedAt: string
  clinicianCleared: boolean
  atBaseline: boolean
}

export function readProtocol(): StoredProtocol | null {
  const raw = readRaw(STORAGE_KEYS.concussionProtocol)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if (parsed.track !== 'learn' && parsed.track !== 'sport') return null
    if (typeof parsed.stage !== 'number' || !Number.isInteger(parsed.stage)) return null
    if (parsed.stage < 1 || parsed.stage > 6) return null
    if (!isNonEmptyString(parsed.startedAt)) return null

    return {
      track: parsed.track,
      stage: parsed.stage,
      startedAt: parsed.startedAt,
      clinicianCleared: parsed.clinicianCleared === true,
      atBaseline: parsed.atBaseline === true,
    }
  } catch {
    return null
  }
}

export function saveProtocol(state: StoredProtocol): void {
  writeRaw(STORAGE_KEYS.concussionProtocol, JSON.stringify(state))
  emit()
}

export function clearProtocol(): void {
  removeRaw(STORAGE_KEYS.concussionProtocol)
  emit()
}

/* ------------------------------------------------------------- tour flag */

/**
 * Has the guided tour already been offered on this device?
 *
 * One boolean, and it records that the offer was *made* rather than that the
 * tour was finished. Someone who declined it has answered the question, and
 * asking again every time they open the app would be nagging — the tour stays
 * permanently reachable from the section bar and from their space, which is
 * where a second look belongs.
 *
 * It sits under the same namespace as everything else, so "erase everything"
 * takes it too and a wiped device is genuinely a fresh one.
 */
export function readTourSeen(): boolean {
  return readRaw(STORAGE_KEYS.tourSeen) === 'true'
}

export function markTourSeen(): void {
  writeRaw(STORAGE_KEYS.tourSeen, 'true')
  emit()
}

/* ------------------------------------------------------- sample-data marks */

/** Ids seeded by the sample-data toggle, so turning it off removes only those. */
export function readSampleIds(): string[] {
  return readList(STORAGE_KEYS.sample, (value): value is string => typeof value === 'string')
}

export function writeSampleIds(ids: string[]): void {
  if (ids.length === 0) {
    removeRaw(STORAGE_KEYS.sample)
  } else {
    writeList(STORAGE_KEYS.sample, ids)
  }
  emit()
}

/** Bulk insert used only by the sample-data seeder. */
export function insertRecords(data: Partial<MindfulData>): void {
  if (data.moods?.length) {
    const existing = readMoodEntries()
    const taken = new Set(existing.map((entry) => entry.date))
    const additions = data.moods.filter((entry) => !taken.has(entry.date))
    writeList(STORAGE_KEYS.moods, [...additions, ...existing])
  }
  if (data.journal?.length) {
    writeList(STORAGE_KEYS.journal, [...data.journal, ...readJournalEntries()])
  }
  if (data.breathing?.length) {
    writeList(STORAGE_KEYS.breathing, [...data.breathing, ...readBreathingSessions()])
  }
  if (data.screeners?.length) {
    writeList(STORAGE_KEYS.screeners, [...data.screeners, ...readScreenerResults()])
  }
  stampSchema()
  emit()
}

/** Remove records by id — the exact inverse of `insertRecords` for the seeder. */
export function removeRecords(ids: readonly string[]): void {
  const drop = new Set(ids)
  writeList(
    STORAGE_KEYS.moods,
    readMoodEntries().filter((entry) => !drop.has(entry.id)),
  )
  writeList(
    STORAGE_KEYS.journal,
    readJournalEntries().filter((entry) => !drop.has(entry.id)),
  )
  writeList(
    STORAGE_KEYS.breathing,
    readBreathingSessions().filter((session) => !drop.has(session.id)),
  )
  writeList(
    STORAGE_KEYS.screeners,
    readScreenerResults().filter((result) => !drop.has(result.id)),
  )
  writeList(
    STORAGE_KEYS.concussion,
    readSymptomChecks().filter((check) => !drop.has(check.id)),
  )
  emit()
}

/* ------------------------------------------------------- export and erase */

/** The complete on-device dataset, in the shape written to a download. */
export function exportAll(): ExportBundle {
  return {
    app: 'mindful',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    concussionProtocol: readProtocol(),
    ...readAll(),
  }
}

export function exportFilename(date = new Date()): string {
  return `mindful-export-${date.toISOString().slice(0, 10)}.json`
}

/**
 * Save everything as a JSON file. Uses an object URL and a synthetic click —
 * still no network, the file is generated in the page.
 */
export function downloadExport(): ExportBundle {
  const bundle = exportAll()
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = exportFilename()
  document.body.append(link)
  link.click()
  link.remove()

  // Revoke on the next frame so the download has certainly started.
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  return bundle
}

/**
 * Wipe every key this app owns, including the onboarding profile. Callers are
 * expected to confirm first and to reset in-memory state afterwards.
 */
export function eraseAll(): void {
  try {
    const keys: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith(STORAGE_NAMESPACE)) keys.push(key)
    }
    for (const key of keys) window.localStorage.removeItem(key)
  } catch {
    /* Nothing was stored in the first place. */
  }
  emit()
}
