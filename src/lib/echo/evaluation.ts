import type { JournalEntry, MindfulData, MoodEntry } from '../storage'
import { buildCorpus } from './corpus'
import { runPipeline } from './pipeline'

/**
 * A fixed evaluation set for Echo's retrieval.
 *
 * Retrieval quality is otherwise unfalsifiable. Thresholds get nudged until a
 * handful of hand-typed queries look right, and nobody notices when a change
 * that fixed one of them broke four others — which in this app means telling
 * someone their own history contains something it does not, or hiding
 * something it does.
 *
 * So there is a corpus with known contents, a set of queries with known right
 * answers, and two standard metrics. It runs in the test suite, on every
 * change, with no model and no browser.
 *
 * The interesting part is the register slices. The same intent is written four
 * ways: plainly, in the clipped lowercase people actually type on a phone, in
 * the phrasing of someone whose first language is not English, and in
 * metaphor. A retriever that scores well on the first and badly on the second
 * is not a good retriever with a rough edge — it is one that works better for
 * people who write like the person who built it, which in a mental-health tool
 * is a fairness problem rather than a quality one. The parity gap is measured
 * and asserted, not assumed.
 *
 * The metaphor slice is expected to be weak on words alone. It is kept in the
 * report rather than dropped, because a known limitation that is measured every
 * run is honest, and one that is quietly excluded from the eval is not.
 */

interface Fixture {
  id: string
  date: string
  body: string
}

/** Twelve entries, each with a distinct theme so a right answer exists. */
const FIXTURES: readonly Fixture[] = [
  {
    id: 'e-sleep',
    date: '2026-01-06',
    body: 'Lying awake again at three in the morning with my thoughts racing about the deadline on Friday. I cannot switch my brain off and the more I try the worse it gets.',
  },
  {
    id: 'e-work',
    date: '2026-01-09',
    body: 'Another day where the workload was more than one person can do. My manager added two more things to the list without taking anything off it.',
  },
  {
    id: 'e-money',
    date: '2026-01-13',
    body: 'Rent went up again and I have been putting off looking at the bills. Every time I open the banking app I close it again straight away.',
  },
  {
    id: 'e-friend',
    date: '2026-01-16',
    body: 'Had coffee with Priya for the first time in months and felt almost normal for an hour. It is strange how much lighter it is to say things out loud.',
  },
  {
    id: 'e-family',
    date: '2026-01-20',
    body: 'Mum called and I could hear she was worried about me, which somehow made it heavier rather than better. I said I was fine because it was easier.',
  },
  {
    id: 'e-exam',
    date: '2026-01-24',
    body: 'Revision is not going in. I read the same page four times and none of it stayed. The exam is in eleven days and I am starting to panic about it.',
  },
  {
    id: 'e-health',
    date: '2026-01-28',
    body: 'Woke up with the headache again and it lasted most of the day. I keep meaning to book the doctor and then the day goes and I have not done it.',
  },
  {
    id: 'e-lonely',
    date: '2026-02-02',
    body: 'The flat is very quiet at the weekends. I did not speak to another person between Friday evening and Monday morning and I did not really notice until now.',
  },
  {
    id: 'e-exercise',
    date: '2026-02-06',
    body: 'Went for a walk by the canal because sitting still was making everything louder. Forty minutes and I came back noticeably steadier.',
  },
  {
    id: 'e-numb',
    date: '2026-02-10',
    body: 'Not sad exactly, just flat. Everything is at arm’s length and I am watching my own week happen from somewhere behind my eyes.',
  },
  {
    id: 'e-argument',
    date: '2026-02-14',
    body: 'We argued about the washing up again, which was obviously not about the washing up. I said something sharper than I meant and then could not take it back.',
  },
  {
    id: 'e-progress',
    date: '2026-02-18',
    body: 'First week in a while where I have kept up with things. Slept properly four nights out of seven and the mornings were easier for it.',
  },
]

export type Register = 'plain' | 'informal' | 'second-language' | 'metaphor'

export interface EvalQuery {
  text: string
  /** The entry this query is asking about. */
  expected: string
  register: Register
}

/** Four intents, each written four ways, plus a few singletons. */
export const EVAL_QUERIES: readonly EvalQuery[] = [
  // Sleeplessness driven by work worry.
  { text: 'I cannot sleep because I am worrying about work', expected: 'e-sleep', register: 'plain' },
  { text: 'cant sleep, brain wont shut up bout the deadline', expected: 'e-sleep', register: 'informal' },
  { text: 'I am not able to sleep, too much thinking of the work', expected: 'e-sleep', register: 'second-language' },
  { text: 'my head is a washing machine at three in the morning', expected: 'e-sleep', register: 'metaphor' },

  // Money avoidance.
  { text: 'I am avoiding looking at my bills and the rent', expected: 'e-money', register: 'plain' },
  { text: 'keep closing the banking app, rent went up, skint', expected: 'e-money', register: 'informal' },
  { text: 'I have fear to open the bank application for the bills', expected: 'e-money', register: 'second-language' },
  { text: 'there is an envelope on the table I keep walking past', expected: 'e-money', register: 'metaphor' },

  // Loneliness.
  { text: 'I have been very alone at the weekend', expected: 'e-lonely', register: 'plain' },
  { text: 'didnt speak to anyone all weekend, flat is dead quiet', expected: 'e-lonely', register: 'informal' },
  { text: 'I am staying alone in the flat, nobody to speak', expected: 'e-lonely', register: 'second-language' },
  { text: 'the weekend went past without my voice in it', expected: 'e-lonely', register: 'metaphor' },

  // Exam stress.
  { text: 'revision is not going in and the exam is close', expected: 'e-exam', register: 'plain' },
  { text: 'cant revise, read the same page 4 times, panicking', expected: 'e-exam', register: 'informal' },
  { text: 'I am reading for the exam but nothing is staying', expected: 'e-exam', register: 'second-language' },
  { text: 'the pages are going straight through me before the test', expected: 'e-exam', register: 'metaphor' },

  // Singletons, covering the rest of the corpus.
  { text: 'the headache came back and I still have not booked the doctor', expected: 'e-health', register: 'plain' },
  { text: 'walking by the water helped more than sitting did', expected: 'e-exercise', register: 'plain' },
  { text: 'we had a row about the washing up', expected: 'e-argument', register: 'plain' },
  { text: 'a good week, I slept properly most nights', expected: 'e-progress', register: 'plain' },
]

/** The fixture corpus as the app would see it. */
export function evaluationData(): MindfulData {
  const journal: JournalEntry[] = FIXTURES.map((fixture) => ({
    id: fixture.id,
    date: fixture.date,
    body: fixture.body,
    createdAt: `${fixture.date}T20:00:00.000Z`,
    updatedAt: `${fixture.date}T20:00:00.000Z`,
  }))

  // A few check-ins so the trajectory reading has something to work with.
  const moods: MoodEntry[] = FIXTURES.map((fixture, index) => ({
    id: `m-${fixture.id}`,
    date: fixture.date,
    score: ((index % 4) + 2) as 2 | 3 | 4 | 5,
    tags: [],
    createdAt: `${fixture.date}T21:00:00.000Z`,
    updatedAt: `${fixture.date}T21:00:00.000Z`,
  }))

  return { journal, moods, breathing: [], screeners: [] }
}

export interface QueryOutcome {
  query: EvalQuery
  /** 1-based position of the expected entry, or null if it was not returned. */
  rank: number | null
  returned: string[]
}

export interface EvalReport {
  outcomes: QueryOutcome[]
  /** Fraction of queries where the right entry appeared at all (top 3). */
  recall: number
  /** Mean reciprocal rank — rewards being right *and* first. */
  mrr: number
  byRegister: Record<Register, { recall: number; mrr: number; count: number }>
}

/**
 * Run every query through the real pipeline and score the results.
 *
 * `dense` is omitted here: the lexical arm and the whole staging around it are
 * what can be measured deterministically, on any machine, in milliseconds. The
 * dense arm's contribution is a property of a 23MB model, and pretending to
 * measure it with a stand-in encoder would produce a number that looks like
 * evidence and is not.
 */
export function evaluate(queries: readonly EvalQuery[] = EVAL_QUERIES): EvalReport {
  const data = evaluationData()
  const passages = buildCorpus(data)

  const outcomes: QueryOutcome[] = queries.map((query) => {
    const answer = runPipeline({ query: query.text, passages, data })
    const returned = (answer.result?.personal ?? []).map((match) => match.passage.entryId)
    const index = returned.indexOf(query.expected)
    return { query, rank: index === -1 ? null : index + 1, returned }
  })

  const score = (subset: readonly QueryOutcome[]) => ({
    recall: subset.length === 0 ? 0 : subset.filter((o) => o.rank !== null).length / subset.length,
    mrr:
      subset.length === 0
        ? 0
        : subset.reduce((total, o) => total + (o.rank ? 1 / o.rank : 0), 0) / subset.length,
    count: subset.length,
  })

  const registers: Register[] = ['plain', 'informal', 'second-language', 'metaphor']
  const byRegister = Object.fromEntries(
    registers.map((register) => [
      register,
      score(outcomes.filter((outcome) => outcome.query.register === register)),
    ]),
  ) as EvalReport['byRegister']

  const overall = score(outcomes)
  return { outcomes, recall: overall.recall, mrr: overall.mrr, byRegister }
}

/** A readable table, printed by the test so a regression is legible. */
export function formatReport(report: EvalReport): string {
  const lines = [
    `overall   recall@3 ${report.recall.toFixed(2)}   MRR ${report.mrr.toFixed(2)}`,
    ...Object.entries(report.byRegister).map(
      ([register, scores]) =>
        `  ${register.padEnd(16)} recall@3 ${scores.recall.toFixed(2)}   MRR ${scores.mrr.toFixed(2)}   (${scores.count})`,
    ),
    ...report.outcomes
      .filter((outcome) => outcome.rank === null)
      .map((outcome) => `  missed [${outcome.query.register}] "${outcome.query.text}"`),
  ]
  return lines.join('\n')
}
