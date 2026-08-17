/**
 * Build Ask's evidence corpus from MedQuAD.
 *
 *   node scripts/build-evidence.mjs
 *
 * MedQuAD is the National Library of Medicine's question-answering collection:
 * ~47,000 question–answer pairs scraped from NIH websites — MedlinePlus,
 * NIDDK, NINDS, NHLBI, GARD and others — each carrying the URL of the page it
 * came from and a question *type* assigned by the people who built it.
 *
 * Three reasons it is the right corpus for this feature and one reason it
 * cannot be used raw.
 *
 * Right: the answers are written by public health bodies for the public, every
 * row is traceable to a live URL so citations are real, and the source pages
 * are US federal works. It is the difference between an app that says "here is
 * what the NHS says" about twelve topics and one that can say it about
 * hundreds.
 *
 * Wrong, raw: most of MedQuAD is rare disease. "What is (are) keratoderma with
 * woolly hair?" is a real question somebody had, and it is not a question a
 * self-care app is the right answer to. Shipping all 47k rows would bloat the
 * bundle with documents that will never be retrieved and would dilute
 * retrieval for the questions people actually ask. So this script curates: it
 * keeps the consumer-facing sources, the question types that map to what Ask
 * answers, and only topics on an explicit list of common health concerns.
 *
 * The output is committed, so the app builds without network access and the
 * corpus is reviewable in a diff. Re-running this script reproduces it.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(
  HERE,
  "..",
  "src",
  "lib",
  "guide",
  "models",
  "medquad-evidence.ts",
);

const DATASET = "lavita%2FMedQuAD";
const PAGE = 100;
const RETRIEVED = new Date().toISOString().slice(0, 10);

/**
 * Sources written for the public, rather than for clinicians or geneticists.
 * GHR (genetics) and GARD (rare disease) are excluded wholesale — excellent
 * resources, wrong audience for this app.
 */
const SOURCES = new Map([
  ["MPlusHealthTopics", "MedlinePlus"],
  [
    "NIDDK",
    "NIDDK (US National Institute of Diabetes and Digestive and Kidney Diseases)",
  ],
  [
    "NINDS",
    "NINDS (US National Institute of Neurological Disorders and Stroke)",
  ],
  ["NHLBI", "NHLBI (US National Heart, Lung, and Blood Institute)"],
  ["CDC", "CDC"],
  ["NIHSeniorHealth", "NIH SeniorHealth"],
]);

/** Question types Ask has a lane for. The rest — inheritance, genetic changes, stages, research — are out of scope. */
const TYPES = new Map([
  ["information", "general-health"],
  ["symptoms", "symptom"],
  ["causes", "symptom"],
  ["treatment", "general-health"],
  ["prevention", "preventive"],
  ["exams and tests", "general-health"],
  ["susceptibility", "preventive"],
  ["outlook", "recovery"],
  ["complications", "general-health"],
  ["considerations", "general-health"],
  ["how can i learn more", "general-health"],
]);

/**
 * Topics a self-care companion should be able to speak to. Matched against the
 * question focus, so "Headache" catches every headache row from every source.
 * Deliberately a list rather than a heuristic: it is the editorial decision
 * about what this app covers, and it should be reviewable as one.
 */
const TOPICS = [
  "headache",
  "migraine",
  "fever",
  "cold",
  "influenza",
  "flu",
  "cough",
  "sore throat",
  "sleep",
  "insomnia",
  "sleep disorders",
  "fatigue",
  "tiredness",
  "back pain",
  "neck pain",
  "joint pain",
  "arthritis",
  "muscle cramps",
  "sprains",
  "dizziness",
  "vertigo",
  "fainting",
  "dehydration",
  "nausea",
  "vomiting",
  "diarrhea",
  "constipation",
  "indigestion",
  "heartburn",
  "stomach",
  "abdominal pain",
  "anxiety",
  "depression",
  "stress",
  "mental health",
  "panic disorder",
  "bipolar",
  "concussion",
  "traumatic brain injury",
  "head injury",
  "brain injury",
  "exercise",
  "physical activity",
  "nutrition",
  "diet",
  "weight",
  "obesity",
  "smoking",
  "alcohol",
  "caffeine",
  "hydration",
  "water",
  "asthma",
  "allergy",
  "allergies",
  "sinusitis",
  "bronchitis",
  "pneumonia",
  "high blood pressure",
  "hypertension",
  "cholesterol",
  "heart",
  "diabetes",
  "thyroid",
  "anemia",
  "vitamin",
  "iron",
  "skin",
  "rash",
  "eczema",
  "acne",
  "dermatitis",
  "eye",
  "vision",
  "hearing",
  "ear",
  "pregnancy",
  "menstruation",
  "menopause",
  "pain",
  "wound",
  "burns",
  "first aid",
  "infection",
  "immunization",
  "vaccines",
  "hand washing",
  "hygiene",

  /*
   * Added after probing the corpus with ordinary questions rather than the
   * ones it was built for. "my knee hurts when I run" and "how do I know if I
   * have ADHD" both got confident answers about something else entirely,
   * because the honest answer — nothing here covers that — was not available
   * to a corpus that had never heard of knees.
   *
   * Everything below is a topic a real question arrived at and found nothing.
   */
  "knee",
  "shoulder",
  "hip",
  "elbow",
  "ankle",
  "foot",
  "wrist",
  "sciatica",
  "tendinitis",
  "carpal tunnel",
  "sports injuries",
  "sprains and strains",
  "attention deficit",
  "adhd",
  "autism",
  "eating disorders",
  "grief",
  "child mental health",
  "teen mental health",
  "seasonal affective",
  "sleep apnea",
  "snoring",
  "restless legs",
  "chronic fatigue",
  "fibromyalgia",
  "irritable bowel",
  "gerd",
  "ulcer",
  "gallstones",
  "food poisoning",
  "lactose",
  "celiac",
  "hemorrhoids",
  "urinary tract",
  "kidney stones",
  "menstruation",
  "premenstrual",
  "endometriosis",
  "psoriasis",
  "hives",
  "shingles",
  "cold sores",
  "athlete's foot",
  "warts",
  "hair loss",
  "dry skin",
  "sunburn",
  "insect bites",
  "dental",
  "toothache",
  "dry eye",
  "conjunctivitis",
  "tinnitus",
  "osteoporosis",
  "gout",
  "varicose",
  "vitamin d",
  "vitamin b12",
  "covid",
  "sore muscles",
  "swelling",
  "numbness",
  "tremor",
  "memory",
  "cough",
  "fainting",
];

/** Longest a document may be. Long enough to be useful, short enough to quote. */
const MAX_CHARS = 700;
/** Shorter than this and the answer is a stub, not evidence. */
const MIN_CHARS = 120;
/**
 * Keep the corpus reviewable and the bundle sane.
 *
 * Eight per topic rather than six: with the topic list widened, the binding
 * constraint on answering "my knee hurts" was breadth, not depth, and a
 * handful of documents per topic is enough for retrieval to have a choice
 * while keeping the shipped corpus something a person could read.
 */
const MAX_PER_TOPIC = 8;
const MAX_DOCUMENTS = 900;

/** Attempts per page before it is treated as missing, and the backoff step. */
const ATTEMPTS = 5;
const BACKOFF_MS = 3000;
/** How many lost pages make the whole corpus untrustworthy. */
const MAX_MISSING_PAGES = 4;

function matchesTopic(focus) {
  const lowered = (focus ?? "").toLowerCase();
  return TOPICS.find((topic) => lowered.includes(topic)) ?? null;
}

/** Trim to a sentence boundary rather than mid-word. */
function truncate(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_CHARS) return clean;

  const cut = clean.slice(0, MAX_CHARS);
  const lastStop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("? "),
    cut.lastIndexOf("! "),
  );
  return lastStop > MIN_CHARS
    ? cut.slice(0, lastStop + 1)
    : `${cut.trimEnd()}…`;
}

/** MedQuAD questions carry a trailing space before the question mark. */
function tidyQuestion(question) {
  return question.replace(/\s+\?/g, "?").replace(/\s+/g, " ").trim();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/*
 * Pages are cached on disk, and that is the difference between a re-run being
 * free and a re-run being another forty minutes of somebody's electricity.
 *
 * The dataset server returns intermittent 500s, so a build can fail through no
 * fault of this script — and every previous failure threw away every page it
 * had successfully fetched. With the cache, a second attempt re-fetches only
 * what is genuinely missing, which is usually a handful of pages.
 *
 * The cache lives under node_modules, so it is already ignored by git and
 * disappears with a clean install. Delete it to force a truly fresh build.
 */
const CACHE = join(HERE, "..", "node_modules", ".cache", "medquad");
mkdirSync(CACHE, { recursive: true });

const cachePath = (source, offset) => join(CACHE, `${source}-${offset}.json`);

let fromCache = 0;
let fromNetwork = 0;

/**
 * One page: from disk if we already have it, otherwise from the server.
 *
 * Returns null only when the page could not be had at all. Callers treat that
 * as missing rather than empty — the two are very different, and conflating
 * them is how a corpus ends up quietly short of a topic.
 */
async function fetchPage(source, offset) {
  const path = cachePath(source, offset);
  if (existsSync(path)) {
    try {
      const cached = JSON.parse(readFileSync(path, "utf8"));
      if (Array.isArray(cached.rows)) {
        fromCache += 1;
        return cached;
      }
    } catch {
      // A truncated cache file is worth exactly nothing; fetch it again.
    }
  }

  const where = encodeURIComponent(`"document_source"='${source}'`);
  const url =
    `https://datasets-server.huggingface.co/filter?dataset=${DATASET}` +
    `&config=default&split=train&where=${where}&offset=${offset}&length=${PAGE}`;

  let last = "";
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      // Bounded, because an unbounded fetch is how this script once hung for
      // twenty minutes on a single page with nothing to show for it.
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (response.ok) {
        const page = await response.json();
        writeFileSync(
          path,
          JSON.stringify({
            rows: page.rows ?? [],
            num_rows_total: page.num_rows_total ?? 0,
          }),
        );
        fromNetwork += 1;
        return page;
      }
      last = `${response.status} ${response.statusText}`;
    } catch (error) {
      last = error.message;
    }
    await sleep(BACKOFF_MS * (attempt + 1));
  }

  console.warn(`\n  ! ${source}@${offset} unavailable: ${last}`);
  return null;
}

/* --------------------------------------------------------- phase 1: fetch */

/*
 * Fetching and selecting are two phases rather than one loop, and that
 * separation is a bug fix rather than tidiness.
 *
 * When they were interleaved, a page that failed and was retried at the end of
 * its source arrived *after* pages that came later in the dataset — by which
 * time the per-topic quota was already full, so the recovered page contributed
 * nothing. That is exactly how one run produced "anxiety: 1" while reporting
 * success: the anxiety page had been fetched, retried, recovered, and then
 * silently discarded for arriving late.
 *
 * Fetch everything first, then select in a fixed order, and the corpus stops
 * depending on which requests happened to fail.
 */
const pages = new Map();
const missing = [];

console.log("Fetching the consumer-facing MedQuAD sources…");

for (const source of SOURCES.keys()) {
  process.stdout.write(`\n${source}\n`);

  /*
   * The row count arrives with the first page, so a source whose first page
   * will not load cannot be paged at all. This is worth more patience than any
   * other request in the build: losing it loses the entire source, which is how
   * every NINDS document once vanished from a build that reported success.
   */
  let first = null;
  for (let attempt = 0; attempt < 4 && !first; attempt += 1) {
    if (attempt > 0) {
      console.warn(`  first page failed, waiting before another attempt…`);
      await sleep(20000);
    }
    first = await fetchPage(source, 0);
  }

  if (!first) {
    throw new Error(
      `could not read the first page of ${source} — the whole source would be missing. ` +
        `Nothing was written; every page that did arrive is cached, so a re-run resumes.`,
    );
  }

  const total = first.num_rows_total ?? 0;
  pages.set(`${source}@0`, first.rows ?? []);

  for (let offset = PAGE; offset < total; offset += PAGE) {
    const page = await fetchPage(source, offset);
    if (page) pages.set(`${source}@${offset}`, page.rows ?? []);
    else missing.push({ source, offset });

    process.stdout.write(`\r  ${Math.min(offset + PAGE, total)}/${total} fetched`);
    await sleep(400);
  }
}

/*
 * One more pass at whatever the server refused, once it has had time to
 * recover. Everything already fetched is cached, so this costs only the pages
 * that actually failed.
 */
if (missing.length > 0) {
  console.log(`\n\nRetrying ${missing.length} page(s) the server refused…`);
  await sleep(10000);

  for (let index = missing.length - 1; index >= 0; index -= 1) {
    const { source, offset } = missing[index];
    const page = await fetchPage(source, offset);
    if (page) {
      pages.set(`${source}@${offset}`, page.rows ?? []);
      missing.splice(index, 1);
    }
  }
}

console.log(
  `\n${pages.size} pages in hand (${fromCache} cached, ${fromNetwork} fetched)` +
    `${missing.length > 0 ? `, ${missing.length} still missing` : ""}.`,
);

if (missing.length > MAX_MISSING_PAGES) {
  throw new Error(
    `${missing.length} pages could not be fetched — the corpus would be thinner than it claims. ` +
      `Nothing was written; what did arrive is cached, so a re-run fetches only the rest.`,
  );
}

/* -------------------------------------------------------- phase 2: select */

/*
 * Deterministic given the pages: sources in declaration order, offsets
 * ascending, first come first served within each topic's quota. The same pages
 * always produce the same corpus, whatever order they arrived in.
 */
const perTopic = new Map();
const seen = new Set();
const documents = [];

outer: for (const source of SOURCES.keys()) {
  const offsets = [...pages.keys()]
    .filter((key) => key.startsWith(`${source}@`))
    .map((key) => Number(key.slice(source.length + 1)))
    .sort((a, b) => a - b);

  for (const offset of offsets) {
    for (const { row } of pages.get(`${source}@${offset}`)) {
      const org = SOURCES.get(row.document_source);
      const intent = TYPES.get((row.question_type ?? "").toLowerCase());
      if (!org || !intent) continue;

      const topic = matchesTopic(row.question_focus);
      if (!topic) continue;

      const answer = (row.answer ?? "").trim();
      if (answer.length < MIN_CHARS) continue;

      const used = perTopic.get(topic) ?? 0;
      if (used >= MAX_PER_TOPIC) continue;

      const question = tidyQuestion(row.question ?? "");
      const key = `${topic}::${row.question_type}::${row.question_focus}`;
      if (seen.has(key)) continue;
      seen.add(key);
      perTopic.set(topic, used + 1);

      documents.push({
        // Qualified by source: MedQuAD reuses question_id across collections —
        // 0000005-1 is both "Acne" and "Anxiety Disorders" — and two documents
        // under one id makes the verifier compare a claim against the wrong
        // body and reject a perfectly good answer.
        id: `medquad-${row.document_source}-${row.question_id}`,
        topic,
        intent,
        type: "public-health",
        org,
        title: question || `${row.question_focus} — ${row.question_type}`,
        // Forced to https. MedQuAD carries some http:// URLs from older NIH
        // pages, and an http link in a health app leaks which condition someone
        // just read about, in cleartext, to anyone on the network.
        url: (row.document_url ?? "").replace(/^http:\/\//, "https://"),
        retrieved: RETRIEVED,
        body: truncate(answer),
        cues: [
          question.toLowerCase(),
          `${row.question_focus} ${row.question_type}`.toLowerCase(),
        ],
      });

      if (documents.length >= MAX_DOCUMENTS) break outer;
    }
  }
}

const REQUIRED_TOPICS = [
  "anxiety",
  "depression",
  "panic disorder",
  "stress",
  "sleep",
  "insomnia",
  "headache",
  "migraine",
  "fatigue",
  "back pain",
  "cough",
  "fever",
  "stomach",
  "dizziness",
];

/**
 * Depth, not just presence.
 *
 * A run that lost pages still produces *a* document for most topics, so
 * "anxiety: 1" passes a presence check while being the visible edge of a
 * corpus with holes in it — the same run had "anxiety: 5" when the server was
 * healthy. Three is the line: below it, something was lost.
 */
const MIN_PER_REQUIRED_TOPIC = 3;

const thin = REQUIRED_TOPICS.filter(
  (topic) => (perTopic.get(topic) ?? 0) < MIN_PER_REQUIRED_TOPIC,
).map((topic) => `${topic} (${perTopic.get(topic) ?? 0})`);

if (thin.length > 0) {
  throw new Error(
    `the corpus came back thin on: ${thin.join(", ")}. ` +
      `Almost certainly skipped pages rather than missing topics — nothing was written. Re-run.`,
  );
}

// Asserted rather than trusted: a duplicate id is silent corruption that only
// shows up later as a verification failure on a good answer.
const byId = new Set();
for (const document of documents) {
  if (byId.has(document.id)) throw new Error(`duplicate evidence id: ${document.id}`);
  byId.add(document.id);
}

documents.sort((a, b) => a.id.localeCompare(b.id));

// Emitted as a TypeScript module rather than raw JSON: Node's ESM loader
// demands an import attribute for `.json`, which Vite and the test runner
// disagree about. A generated `.ts` imports identically everywhere.
writeFileSync(
  OUTPUT,
  "/** Generated by `npm run build:evidence` from MedQuAD. Do not edit by hand. */\n" +
    `export default ${JSON.stringify(documents)} as const\n`,
);

const byTopic = [...perTopic.entries()].sort((a, b) => b[1] - a[1]);
console.log(
  `\n\nKept ${documents.length} documents across ${byTopic.length} topics.`,
);
console.log(byTopic.map(([topic, count]) => `  ${topic}: ${count}`).join("\n"));
console.log(`\nWrote ${OUTPUT}\n`);
