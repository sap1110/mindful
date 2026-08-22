import { GUIDANCE as CONCUSSION_GUIDANCE, EVIDENCE_SOURCES } from '../concussion/evidence'
import { NEUROSCIENCE_NOTES } from '../concussion/neuroscience'
import {
  buildLexicalIndex,
  coverage,
  tokenize,
  type LexicalDocument,
  type LexicalIndex,
} from '../echo/keyword'
import { LIBRARY, LIBRARY_SOURCES } from '../echo/library'
import medquad from './models/medquad-evidence'

/**
 * The evidence base behind Ask — the guide's only source of factual claims.
 *
 * Ask answers health questions the way the rest of Mindful answers everything:
 * from named sources, on this device, with nothing invented in between. This
 * corpus is the entire universe of facts the composer is allowed to state. A
 * claim that cannot be traced to one of these documents does not survive
 * verification, which is the property that makes "no hallucinations" an
 * enforced invariant rather than a hope.
 *
 * Every document carries the metadata the PRD asks for — source organisation,
 * title, topic, type, URL, retrieval date — because a citation that cannot be
 * followed is decoration. The register rules are the app's usual ones: hedged
 * where the evidence is hedged, "may help" never "will fix", nothing about
 * doses, and nothing a source did not actually say.
 *
 * Four feeds, one corpus:
 *   1. A curated slice of **MedQuAD**, the US National Library of Medicine's
 *      question-answering collection — real question-and-answer pairs from
 *      MedlinePlus, NIDDK, NINDS, NHLBI and CDC pages, each keeping the URL it
 *      came from. This is the bulk of the coverage and the reason Ask can
 *      answer a question about a topic nobody hand-wrote a document for. It is
 *      curated rather than taken whole: see `scripts/build-evidence.mjs` for
 *      which sources, question types and topics are kept, and why shipping all
 *      47,000 rows would have made retrieval worse rather than better.
 *   2. Documents written for Ask itself — the common physical-health questions
 *      (headache, fever, sleep, colds, hydration, activity, back pain), each
 *      distilled from NHS / CDC / WHO / MedlinePlus public guidance. These stay
 *      because they are written in the register people ask in, and they carry
 *      the emergency thresholds that a general corpus does not foreground.
 *   3. Echo's mental-health library, adapted — same bodies, same rules.
 *   4. The concussion guidance and neuroscience notes, adapted — already cited
 *      to the consensus statements and primary literature.
 *
 * Frozen at build time, retrieved 2026-08-14. No runtime fetch, ever: a live
 * content feed would quietly turn every health question into a network request
 * carrying what the person just typed.
 */

export type EvidenceType = 'guideline' | 'public-health' | 'research-summary'

export interface EvidenceDoc {
  id: string
  /** Coarse topic for grouping and evaluation, e.g. 'headache'. */
  topic: string
  type: EvidenceType
  /** The body that published it, named the way a citation names it. */
  org: string
  title: string
  url: string
  /** When this snapshot was checked against the source. */
  retrieved: string
  /** The evidence itself — attributed and hedged in the wording. */
  body: string
  /** Everyday phrasings of the questions this answers. Retrieval lives on these. */
  cues: readonly string[]
}

const RETRIEVED = '2026-08-14'

/** Documents written for Ask: the physical-health questions people actually have. */
const PHYSICAL_HEALTH: readonly EvidenceDoc[] = [
  {
    id: 'headache-common',
    topic: 'headache',
    type: 'public-health',
    org: 'NHS',
    title: 'Headaches',
    url: 'https://www.nhs.uk/conditions/headaches/',
    retrieved: RETRIEVED,
    body: 'The NHS describes most headaches as not serious and usually passing within a few hours. Common everyday triggers it lists include not drinking enough fluid, missed meals, too little sleep, stress, eye strain, and drinking alcohol. Its self-care advice is rest, fluids, and relaxation, and it notes a pharmacist can advise on over-the-counter options.',
    cues: [
      'why do I keep getting headaches',
      'I have a headache what should I do',
      'my head hurts',
      'headache after work all day',
      'what causes headaches',
    ],
  },
  {
    id: 'headache-gp',
    topic: 'headache',
    type: 'public-health',
    org: 'NHS',
    title: 'Headaches — when to see a GP',
    url: 'https://www.nhs.uk/conditions/headaches/',
    retrieved: RETRIEVED,
    body: 'The NHS advises seeing a GP about headaches that keep coming back, are not relieved by ordinary painkillers, or come with other changes — for example a throbbing pain at the front or side of the head, or feeling sick and finding light uncomfortable, which can suggest migraine. A pattern that is new for you, or clearly changing, is worth describing to a professional rather than tracking alone.',
    cues: [
      'my headaches keep coming back',
      'painkillers are not helping my headache',
      'headache for days',
      'do I have migraines',
      'headache with nausea and light hurting my eyes',
    ],
  },
  {
    id: 'headache-emergency',
    topic: 'headache',
    type: 'public-health',
    org: 'NHS',
    title: 'Headaches — emergency signs',
    url: 'https://www.nhs.uk/conditions/headaches/',
    retrieved: RETRIEVED,
    body: 'The NHS treats some headaches as emergencies: one that comes on suddenly and is extremely painful, a headache after a significant head injury, or a headache with a stiff neck and fever, a rash, confusion, weakness or numbness, slurred speech, eye pain, or vision changes. These mean emergency care now, not self-care.',
    cues: [
      'worst headache of my life',
      'sudden extremely painful headache',
      'headache with stiff neck and fever',
      'headache and slurred speech',
      'headache after hitting my head',
    ],
  },
  {
    id: 'fever-adults',
    topic: 'fever',
    type: 'public-health',
    org: 'NHS',
    title: 'Fever in adults',
    url: 'https://www.nhs.uk/conditions/fever-in-adults/',
    retrieved: RETRIEVED,
    body: 'The NHS describes a high temperature in adults as usually 38°C or above, most often a normal response to infection, and usually settling with rest and plenty of fluids. It advises getting medical advice if a fever does not settle after a few days, keeps getting worse, or comes with signs like a stiff neck, a rash that does not fade when pressed, confusion, difficulty breathing, or severe dehydration.',
    cues: [
      'I have a fever what should I do',
      'how high is a fever',
      'temperature of 38 is that bad',
      'fever for three days',
      'when is a fever serious',
    ],
  },
  {
    id: 'fever-child',
    topic: 'fever',
    type: 'public-health',
    org: 'NHS',
    title: 'Fever in children',
    url: 'https://www.nhs.uk/conditions/fever-in-children/',
    retrieved: RETRIEVED,
    body: 'For children, the NHS advises urgent medical advice for a baby under three months with a temperature of 38°C or higher, and for any child whose fever comes with drowsiness that is hard to rouse, a rash that does not fade under a glass, a stiff neck, difficulty breathing, or signs of dehydration. Childhood fevers are common and most pass, but the thresholds for asking are deliberately low.',
    cues: [
      'my baby has a fever',
      'child temperature 38 what do I do',
      'toddler fever when to worry',
      'is my kids fever serious',
    ],
  },
  {
    id: 'hydration',
    topic: 'hydration',
    type: 'public-health',
    org: 'NHS',
    title: 'Water, drinks and hydration',
    url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/',
    retrieved: RETRIEVED,
    body: 'The NHS Eatwell guidance suggests six to eight cups or glasses of fluid a day for most people, and more in hot weather or when exercising. It lists dark, strong-smelling urine, thirst, dizziness or light-headedness, and tiredness among the signs of dehydration. Water, lower-fat milk and sugar-free drinks all count towards the total.',
    cues: [
      'how much water should I drink a day',
      'am I dehydrated',
      'signs of dehydration',
      'dizzy and my pee is dark',
      'always tired and thirsty',
    ],
  },
  {
    id: 'sleep-hygiene',
    topic: 'sleep',
    type: 'public-health',
    org: 'NHS',
    title: 'Insomnia and sleep problems',
    url: 'https://www.nhs.uk/conditions/insomnia/',
    retrieved: RETRIEVED,
    body: 'For trouble sleeping, the NHS suggests keeping regular hours for going to bed and waking, winding down before bed, keeping the bedroom dark and quiet, avoiding caffeine, alcohol and big meals late in the day, and not staring at screens right before sleep. It notes insomnia usually improves by changing habits like these, and suggests seeing a GP when it goes on for months or affects daily life.',
    cues: [
      'I cannot sleep at night',
      'how do I fix my sleep schedule',
      'tips for falling asleep',
      'waking up at 3am every night',
      'insomnia what helps',
    ],
  },
  {
    id: 'colds-flu',
    topic: 'cold',
    type: 'public-health',
    org: 'NHS',
    title: 'Common cold',
    url: 'https://www.nhs.uk/conditions/common-cold/',
    retrieved: RETRIEVED,
    body: 'The NHS describes colds as usually clearing up on their own within a week or two, with rest, sleep, plenty of fluids and warm drinks as the core self-care. A pharmacist can advise on remedies for the symptoms. It suggests seeing a GP if symptoms last more than three weeks, suddenly get worse, or come with chest pain or difficulty breathing.',
    cues: [
      'how long does a cold last',
      'best way to get over a cold',
      'sick with a cold what should I do',
      'cold for two weeks is that normal',
      'flu or cold what helps',
    ],
  },
  {
    id: 'physical-activity',
    topic: 'exercise',
    type: 'guideline',
    org: 'World Health Organization (WHO)',
    title: 'Physical activity guidelines',
    url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
    retrieved: RETRIEVED,
    body: 'The WHO recommends adults do 150 to 300 minutes of moderate aerobic activity a week — or 75 to 150 minutes of vigorous activity — plus muscle-strengthening twice a week, and is explicit that some activity is better than none: benefits start well below the target, and any move from sitting to moving counts. Walking briskly counts as moderate activity.',
    cues: [
      'how much exercise should I do',
      'is walking enough exercise',
      'minimum exercise per week',
      'I never exercise where do I start',
    ],
  },
  {
    id: 'back-pain',
    topic: 'back-pain',
    type: 'public-health',
    org: 'NHS',
    title: 'Back pain',
    url: 'https://www.nhs.uk/conditions/back-pain/',
    retrieved: RETRIEVED,
    body: 'The NHS describes most back pain as improving within a few weeks, and its central advice is to keep gently moving and carry on with normal activities as much as possible — prolonged bed rest tends to make it worse, not better. It treats some combinations as emergencies: back pain with numbness around the genitals or buttocks, loss of bladder or bowel control, weakness in the legs, or after a serious accident.',
    cues: [
      'my back hurts what should I do',
      'should I rest my bad back',
      'lower back pain for a week',
      'back pain exercises or rest',
    ],
  },
  {
    id: 'dizzy-standing',
    topic: 'dizziness',
    type: 'public-health',
    org: 'NHS',
    title: 'Dizziness',
    url: 'https://www.nhs.uk/conditions/dizziness/',
    retrieved: RETRIEVED,
    body: 'The NHS lists dehydration, standing up too quickly, low blood sugar and some medicines among common reasons for feeling dizzy or light-headed, and suggests lying down until it passes, moving slowly, and drinking fluids. It advises seeing a GP about dizziness that keeps returning or will not go away, and urgent care for dizziness with fainting, chest pain, a severe headache, or trouble speaking or moving.',
    cues: [
      'I feel dizzy when I stand up',
      'why am I lightheaded',
      'keep getting dizzy spells',
      'room spinning when I get up',
    ],
  },
  {
    id: 'care-routes',
    topic: 'navigating-care',
    type: 'public-health',
    org: 'NHS',
    title: 'Where to go for help',
    url: 'https://www.nhs.uk/nhs-services/',
    retrieved: RETRIEVED,
    body: 'Public health services generally describe three routes and Mindful repeats them rather than inventing its own: a pharmacist for everyday symptoms and over-the-counter questions, a GP or primary-care clinician for symptoms that persist, recur, or worry you, and emergency services for the danger signs — the point being that "is this serious enough to ask about" is itself a question professionals expect and would rather hear early.',
    cues: [
      'should I see a doctor about this',
      'is this worth a GP appointment',
      'who do I ask about symptoms',
      'do I need to go to hospital',
    ],
  },
  {
    id: 'medication-safety',
    topic: 'medication',
    type: 'public-health',
    org: 'MedlinePlus (US National Library of Medicine)',
    title: 'Using medicines safely',
    url: 'https://medlineplus.gov/medicines.html',
    retrieved: RETRIEVED,
    body: 'MedlinePlus’s medicines guidance is the boundary Mindful keeps: doses, interactions, starting or stopping a prescribed medicine, and mixing medicines are questions for the prescriber or a pharmacist, who can see the whole picture — every medicine you take, your history, and the reason it was prescribed. Its general rules are to follow the label, use one pharmacy where possible, and never change a prescribed dose without asking.',
    cues: [
      'can I take these two medicines together',
      'what dose should I take',
      'should I stop taking my medication',
      'is it safe to mix painkillers',
    ],
  },
]

/* -------------------------------------------------------------- adapters */

/**
 * Echo's mental-health library, re-expressed as evidence documents. Same
 * sources, same hedging — only the shape changes.
 */
const MENTAL_HEALTH: readonly EvidenceDoc[] = LIBRARY.map((card) => {
  const source = LIBRARY_SOURCES[card.source]
  return {
    id: `mh-${card.id}`,
    topic: 'mental-health',
    type: 'public-health' as const,
    org: source.name,
    title: card.title,
    url: source.url,
    retrieved: '2026-08-13',
    body: card.body,
    cues: card.cues,
  }
})

/** The concussion guidance, already cited to the consensus statements. */
const CONCUSSION: readonly EvidenceDoc[] = CONCUSSION_GUIDANCE.map((item) => {
  const source = EVIDENCE_SOURCES[item.sourceId]
  return {
    id: `conc-${item.id}`,
    topic: 'concussion',
    type: 'guideline' as const,
    org: source.name,
    title: item.title,
    url: source.url,
    retrieved: RETRIEVED,
    body: item.body,
    cues: [item.title.toLowerCase()],
  }
})

/** The neuroscience notes — research summaries with primary citations. */
const NEUROSCIENCE: readonly EvidenceDoc[] = NEUROSCIENCE_NOTES.map((note) => {
  const source = EVIDENCE_SOURCES[note.sourceId]
  return {
    id: `neuro-${note.id}`,
    topic: 'concussion',
    type: 'research-summary' as const,
    org: source.name,
    title: note.title,
    url: source.url,
    retrieved: RETRIEVED,
    body: note.body,
    cues: [note.title.toLowerCase()],
  }
})

/**
 * The MedQuAD slice, built by `npm run build:evidence` and committed.
 *
 * Ordered *after* the hand-written documents so that when relevance ties, the
 * document written in the register someone actually asked in wins. Everything
 * downstream treats them identically — same verification, same citation
 * requirements, same floors.
 */
const MEDQUAD: readonly EvidenceDoc[] = medquad as unknown as EvidenceDoc[]

export const EVIDENCE_CORPUS: readonly EvidenceDoc[] = [
  ...PHYSICAL_HEALTH,
  ...MENTAL_HEALTH,
  ...CONCUSSION,
  ...NEUROSCIENCE,
  ...MEDQUAD,
]

/** The text a retriever sees: body plus the everyday phrasings. */
export function evidenceEmbeddingText(doc: EvidenceDoc): string {
  return [doc.title, doc.body, ...doc.cues].join('\n')
}

export function evidenceDoc(id: string): EvidenceDoc | undefined {
  return EVIDENCE_CORPUS.find((doc) => doc.id === id)
}

/* ---------------------------------------------------- what the corpus knows */

/**
 * Words that are evaluative rather than topical, dropped from Ask's retrieval.
 *
 * BM25 uses rarity as a proxy for informativeness, and on a small curated
 * corpus that proxy breaks in a specific, damaging way. "how do I sleep
 * better" was answered from a page about **back pain**: `better` appears in 12
 * of 336 documents and `sleep` in 33, so `better` carries IDF 3.29 against
 * `sleep`'s 2.31 and outranks the actual subject of the question. Whichever
 * page says "gets better" most often wins, and "most back pain gets better
 * within a few weeks" says it a lot.
 *
 * The distinguishing property is not rarity but correlation with subject.
 * `night` is rarer than `sleep` too (IDF 3.02) and breaks nothing, because the
 * documents containing "night" *are* the sleep documents. "better" is
 * scattered across the corpus at random with respect to topic.
 *
 * Kept to comparatives and judgements. Nothing here names a symptom, a
 * feeling or a condition, and emotional vocabulary is deliberately absent —
 * "low", "tired" and "alone" are all topical in a mental-health corpus.
 *
 * Crucially this is *not* added to the shared `STOPWORDS`, which Echo also
 * uses. Echo searches a person's own journal, where "I feel better today" is
 * precisely the sentence it exists to find again. The same word is signal in
 * one corpus and noise in the other, which is why the list is per-corpus
 * rather than global.
 */
export const EVIDENCE_STOPWORDS: ReadonlySet<string> = new Set([
  'bad',
  'best',
  'better',
  'easier',
  'fine',
  'good',
  'great',
  'harder',
  'okay',
  'worse',
  'worst',
])

/**
 * One index over the corpus, built once, shared by everything that needs to
 * know how rare a word is.
 *
 * Built lazily rather than at module load: importing this file must not cost
 * three hundred tokenisations on a screen that never asks a question.
 */
let corpusIndex: LexicalIndex | null = null
let byId: Map<string, LexicalDocument> | null = null

function index(): LexicalIndex {
  if (!corpusIndex) {
    corpusIndex = buildLexicalIndex(
      EVIDENCE_CORPUS.map((doc) => ({ id: doc.id, text: evidenceEmbeddingText(doc) })),
      EVIDENCE_STOPWORDS,
    )
    byId = new Map(corpusIndex.documents.map((doc) => [doc.id, doc]))
  }
  return corpusIndex
}

/**
 * Tokenize a question the way Ask's evidence index is tokenized.
 *
 * Every query that will be scored against the corpus has to come through
 * here. `coverage` charges each query term's IDF to its ceiling whether or not
 * the index holds that term, and an unindexed term scores about 6.5 against a
 * real term's 2 to 3 — so tokenizing a query without this list would not
 * merely leave "better" in, it would divide every relevance score by roughly
 * three and take the citations down with it.
 */
export function evidenceTokens(text: string): Set<string> {
  return tokenize(text, EVIDENCE_STOPWORDS)
}

/**
 * How much of a question a document actually covers, 0-1.
 *
 * The single definition of "does this document pertain to this question",
 * used by retrieval to decide what may be cited and by the verifier to check
 * that decision independently. It is IDF-weighted, so a shared "depressed"
 * counts for far more than a shared "think" and "might" — see
 * `weightedOverlap` for the failure that made this necessary.
 */
export function evidenceRelevance(queryTokens: ReadonlySet<string>, doc: EvidenceDoc): number {
  index()
  const indexed = byId?.get(doc.id)
  return indexed ? coverage(index(), indexed, [...queryTokens]) : 0
}

/**
 * Every word in the corpus specific enough to be the subject of a question.
 *
 * Drawn from the titles, topics and everyday phrasings of the documents
 * themselves, then cut to the words that appear in under a tenth of the
 * corpus. "depression", "acne", "migraine", "insomnia" survive; "what",
 * "help", "pain", "people" do not, because a word in a third of the documents
 * names nothing in particular.
 *
 * This exists so that a short question is not mistaken for a vague one.
 * "what can I do about acne" has one content word and is perfectly clear;
 * "is this bad" has one content word and is not. Counting words cannot tell
 * them apart. Asking whether the question names something the corpus knows
 * about can.
 */
let anchors: Set<string> | null = null

export function topicAnchors(): ReadonlySet<string> {
  if (anchors) return anchors

  const built = new Set<string>()
  const ceiling = Math.max(2, Math.floor(EVIDENCE_CORPUS.length * 0.1))

  /*
   * The `topic` field only — not the titles, and certainly not the cues.
   *
   * Both wider readings let the gate through things that are not names.
   * The cues are everyday phrasings ("my head hurts"), which made "hurt" and
   * "worried" into subjects and got "it hurts" answered as though it were a
   * specific question. Titles are better but not clean either: the concussion
   * notes are titled in sentences, and "If light and screens hurt…" put
   * "hurt" straight back in.
   *
   * `topic` is the one field that is a name by construction — 'headache',
   * 'insomnia', 'acne', 'knee' — assigned to every document from an explicit
   * list. It is exactly the vocabulary of things this corpus can be about.
   */
  for (const doc of EVIDENCE_CORPUS) {
    for (const term of tokenize(doc.topic)) {
      if ((index().documentFrequency.get(term) ?? 0) <= ceiling) built.add(term)
    }
  }

  anchors = built
  return anchors
}
