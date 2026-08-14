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

import { writeFileSync } from "node:fs";
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
];

/** Longest a document may be. Long enough to be useful, short enough to quote. */
const MAX_CHARS = 700;
/** Shorter than this and the answer is a stub, not evidence. */
const MIN_CHARS = 120;
/** Keep the corpus reviewable and the bundle sane. */
const MAX_PER_TOPIC = 6;
const MAX_DOCUMENTS = 900;

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

/**
 * Ask the server for one source's rows rather than paging the whole dataset.
 *
 * Scanning all 47k rows client-side meant ~470 requests and a rate limit at
 * offset 5,100 — and the first five thousand rows are genetics pages this
 * script discards anyway. Filtering server-side by `document_source` cuts it
 * to a few dozen requests over the ~2,000 rows that could possibly qualify.
 */
async function fetchFiltered(source, offset) {
  const where = encodeURIComponent(`"document_source"='${source}'`);
  const url =
    `https://datasets-server.huggingface.co/filter?dataset=${DATASET}` +
    `&config=default&split=train&where=${where}&offset=${offset}&length=${PAGE}`;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response.json();
    // The index may still be warming, or we may be going too fast.
    await sleep(2500 * (attempt + 1));
  }
  throw new Error(`failed to fetch ${source} at offset ${offset}`);
}

const perTopic = new Map();
const seen = new Set();
const documents = [];

console.log("Fetching the consumer-facing MedQuAD sources…");

for (const source of SOURCES.keys()) {
  let offset = 0;
  let sourceTotal = Infinity;
  console.log(`\n${source}`);

  while (offset < sourceTotal && documents.length < MAX_DOCUMENTS) {
    const page = await fetchFiltered(source, offset);
    sourceTotal = page.num_rows_total ?? 0;

    for (const { row } of page.rows) {
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
        // pages, and an http link in a health app leaks which condition
        // someone just read about, in cleartext, to anyone on the network.
        url: (row.document_url ?? "").replace(/^http:\/\//, "https://"),
        retrieved: RETRIEVED,
        body: truncate(answer),
        cues: [
          question.toLowerCase(),
          `${row.question_focus} ${row.question_type}`.toLowerCase(),
        ],
      });

      if (documents.length >= MAX_DOCUMENTS) break;
    }

    offset += PAGE;
    process.stdout.write(
      `  ${Math.min(offset, sourceTotal)}/${sourceTotal} scanned, ${documents.length} kept\r`,
    );
    await sleep(400);
  }
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
