import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { assessRisk } from '../src/lib/echo/safety'

/**
 * Audit the crisis guard against real text.
 *
 *   npx tsx scripts/audit-crisis-guard.ts "<path to Combined Data.csv>"
 *
 * The guard's recall has only ever been measured against phrasings written by
 * the person who wrote the guard, which measures imagination rather than
 * coverage. This runs it over the Kaggle "Sentiment Analysis for Mental
 * Health" corpus — ~53,000 statements scraped from social media and labelled
 * by mental-health status — and reports two numbers that matter:
 *
 *   recall on `Suicidal`   how much real disclosure language the guard catches
 *   fire rate on `Normal`  how often it interrupts someone who is not in crisis
 *
 * **How to read the recall number.** It is a lower bound, and a loose one. The
 * corpus labels a *post's overall status*, not whether a sentence discloses
 * intent — plenty of `Suicidal` rows are someone describing a bad week, asking
 * about medication, or replying to a thread, with no disclosure in the text at
 * all. A guard that fired on every one of them would be a guard that fires on
 * everything. So a miss here is not automatically a bug; the value is in
 * *reading* the misses and finding the ones that are genuine disclosures
 * phrased in ways nobody thought to write down.
 *
 * The corpus is deliberately not committed to this repository. It is 31MB of
 * real people's posts about their mental health, gathered from public
 * platforms; using it to find gaps in a safety guard is a reasonable thing to
 * do with it, and redistributing it inside a hackathon project is not. Run the
 * script against a local copy. What gets committed is what was learned: the
 * patterns, and the numbers in this file's output.
 */

const path = process.argv[2]
if (!path) {
  console.error('usage: npx tsx scripts/audit-crisis-guard.ts "<path to Combined Data.csv>"')
  process.exit(1)
}

/** Minimal CSV reader for this file's shape: index, statement, status. */
async function* rows(file: string): AsyncGenerator<{ statement: string; status: string }> {
  const stream = createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity })

  let buffer = ''
  let header = true

  for await (const line of stream) {
    buffer = buffer ? `${buffer}\n${line}` : line

    // A record is complete when its quotes balance.
    const quotes = (buffer.match(/"/g) ?? []).length
    if (quotes % 2 !== 0) continue

    const record = buffer
    buffer = ''
    if (header) {
      header = false
      continue
    }

    const fields = parseLine(record)
    if (fields.length < 3) continue
    yield { statement: fields[1] ?? '', status: (fields[2] ?? '').trim() }
  }
}

function parseLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields
}

interface Tally {
  total: number
  acute: number
  concern: number
}

const byStatus = new Map<string, Tally>()
const misses: string[] = []
const falsePositives: string[] = []

for await (const { statement, status } of rows(path)) {
  const text = statement.trim()
  if (!text || !status) continue

  const tally = byStatus.get(status) ?? { total: 0, acute: 0, concern: 0 }
  tally.total += 1

  const risk = assessRisk(text)
  if (risk.level === 'acute') tally.acute += 1
  else if (risk.level === 'concern') tally.concern += 1

  byStatus.set(status, tally)

  // Short misses are the readable ones — a 1,400-character post is a thread,
  // not a phrasing to learn from.
  if (status === 'Suicidal' && risk.level !== 'acute' && text.length < 160 && misses.length < 400) {
    misses.push(text.replace(/\s+/g, ' '))
  }
  if (status === 'Normal' && risk.level === 'acute' && falsePositives.length < 120) {
    falsePositives.push(text.replace(/\s+/g, ' ').slice(0, 140))
  }
}

console.log('\nstatus                total    acute   concern   acute%')
console.log('─'.repeat(58))
for (const [status, tally] of [...byStatus.entries()].sort((a, b) => b[1].total - a[1].total)) {
  const rate = ((tally.acute / tally.total) * 100).toFixed(1)
  console.log(
    `${status.padEnd(22)}${String(tally.total).padStart(6)}${String(tally.acute).padStart(9)}` +
      `${String(tally.concern).padStart(10)}${rate.padStart(9)}%`,
  )
}

console.log(`\n── sample of short "Suicidal" rows the guard did not flag (${misses.length} kept)`)
for (const miss of misses.slice(0, 60)) console.log(`  · ${miss.slice(0, 120)}`)

console.log(`\n── "Normal" rows the guard flagged as acute (${falsePositives.length})`)
for (const positive of falsePositives.slice(0, 40)) console.log(`  · ${positive}`)
console.log('')
