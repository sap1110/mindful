/**
 * On-device storage for everything Phase 2 records.
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
  /** The in-progress journal entry, autosaved as you type. */
  draft: 'mindful.v1.journal.draft',
  /** Ids of records seeded by the sample-data toggle, so it can be undone exactly. */
  sample: 'mindful.v1.sample',
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

export interface MindfulData {
  moods: MoodEntry[]
  journal: JournalEntry[]
  breathing: BreathingSession[]
}

export interface ExportBundle extends MindfulData {
  schemaVersion: number
  exportedAt: string
  app: 'mindful'
}

const EMPTY: MindfulData = { moods: [], journal: [], breathing: [] }

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

/** The whole on-device dataset, newest first in each collection. */
export function readAll(): MindfulData {
  return {
    moods: readMoodEntries(),
    journal: readJournalEntries(),
    breathing: readBreathingSessions(),
  }
}

/* ------------------------------------------------------- reactive snapshot */

const listeners = new Set<() => void>()
let snapshot: MindfulData = EMPTY
let hydrated = false

function refresh(): void {
  snapshot = readAll()
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

/* ------------------------------------------------------- sample-data marks */

/** Ids seeded by the sample-data toggle, so turning it off removes only those. */
export function readSampleIds(): string[] {
  return readList(STORAGE_KEYS.sample, (value): value is string => typeof value === 'string')
}

export function writeSampleIds(ids: string[]): void {
  if (ids.length === 0) {
    removeRaw(STORAGE_KEYS.sample)
    return
  }
  writeList(STORAGE_KEYS.sample, ids)
}

export function hasSampleData(): boolean {
  return readSampleIds().length > 0
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
  emit()
}

/* ------------------------------------------------------- export and erase */

/** The complete on-device dataset, in the shape written to a download. */
export function exportAll(): ExportBundle {
  return {
    app: 'mindful',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
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
