/**
 * The lexical arm: tokenisation and BM25.
 *
 * Echo runs two retrievers over the same corpus and fuses them. This is the
 * half that needs no model at all — which makes it both the fallback for a
 * browser that cannot or will not download 23MB, and a genuine contributor to
 * every hybrid search on top of it. Dense retrieval is very good at meaning and
 * quietly bad at *particulars*: an entry that names a person, a place, a drug,
 * a diagnosis or an unusual word is found by matching that word, and a 384-
 * dimensional summary of a paragraph will happily lose it.
 *
 * BM25 rather than the raw word-overlap this started as. Overlap treats every
 * shared word as equally informative, so "work" — which appears in half of
 * anyone's journal — counted as much as "harpsichord". BM25 weights a term by
 * how rare it is in *this person's* corpus, which is the right notion of rare:
 * for someone who writes about work every day, "work" genuinely carries little
 * signal, and for someone who mentions it twice it carries a lot.
 *
 * Scores are not comparable with cosine similarity and no attempt is made to
 * force them onto the same scale. Fusion happens on ranks instead — see
 * `fuse.ts` — which is what makes mixing two incompatible scorers honest.
 */

/**
 * Words carrying no retrieval signal. Kept short on purpose: an aggressive
 * stopword list strips the emotional vocabulary this feature exists to match.
 * "alone", "tired" and "cannot" all stay.
 */
const STOPWORDS = new Set([
  'a', 'about', 'again', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'being', 'but', 'by', 'can', 'did', 'do', 'does', 'doing',
  'for', 'from', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'him',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'me',
  'more', 'my', 'no', 'not', 'of', 'on', 'or', 'our', 'out', 'over', 'own',
  'she', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'to', 'too', 'up', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why',
  'will', 'with', 'would', 'you', 'your',
])

/**
 * Crude but predictable suffix folding, so "feeling" reaches "feel".
 *
 * `-ion` is here for a specific failure. People describe themselves with the
 * adjective and public health bodies title their pages with the noun: someone
 * types "I think I might be depressed" and every document says "depression".
 * Without this, those are two unrelated words — the question was retrieving
 * pages about insomnia and hearing loss because the only word it could match
 * on was "think". The same fold quietly fixes infected/infection,
 * inflamed/inflammation and prevented/prevention.
 *
 * `-ions` before `-ion` because the loop takes the first suffix that matches
 * and "depressions" must not stop at the `s`.
 */
function stem(word: string): string {
  for (const suffix of ['ions', 'ion', 'ing', 'ness', 'ed', 'ly', 's']) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length)
    }
  }
  return word
}

/**
 * Contractions, written every way people actually write them.
 *
 * This is not tidiness, it is fairness. "cannot", "can't", "cant" and "can’t"
 * are the same word, and a search that only understood the apostrophised form
 * would quietly work better for people who punctuate their diary — which is
 * not a group anyone should be building a mental-health feature to favour.
 * Phone keyboards produce curly apostrophes, tired thumbs produce none.
 */
const CONTRACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(can\s?not|can[’']?t|cant)\b/gu, 'cannot'],
  [/\b(do\s?not|don[’']?t|dont)\b/gu, 'do not'],
  [/\b(will\s?not|won[’']?t|wont)\b/gu, 'will not'],
  [/\b(i\s?m|i[’']m)\b/gu, 'i am'],
  [/\b(i\s?ve|i[’']ve)\b/gu, 'i have'],
  [/\b(i\s?ll|i[’']ll)\b/gu, 'i will'],
  [/\b(it\s?s|it[’']s)\b/gu, 'it is'],
  [/\b(did\s?nt|didn[’']t)\b/gu, 'did not'],
  [/\b(is\s?nt|isn[’']t)\b/gu, 'is not'],
  [/\b(was\s?nt|wasn[’']t)\b/gu, 'was not'],
  [/\b(have\s?nt|haven[’']t)\b/gu, 'have not'],
  [/\b(could\s?nt|couldn[’']t)\b/gu, 'could not'],
  [/\b(should\s?nt|shouldn[’']t)\b/gu, 'should not'],
  [/\b(would\s?nt|wouldn[’']t)\b/gu, 'would not'],
  [/\bgonna\b/gu, 'going to'],
  [/\bwanna\b/gu, 'want to'],
  [/\bkinda\b/gu, 'kind of'],
  [/\bcos\b|\bcoz\b|\bcuz\b/gu, 'because'],
  [/\bbout\b/gu, 'about'],
  [/\bthru\b/gu, 'through'],
  [/\bu\b/gu, 'you'],
  [/\bur\b/gu, 'your'],
]

/** Normalise before tokenising: unicode, case, curly quotes, contractions. */
export function normaliseText(text: string): string {
  let out = text.normalize('NFKC').toLowerCase().replace(/[’']/gu, "'")
  for (const [pattern, replacement] of CONTRACTIONS) out = out.replace(pattern, replacement)
  return out
}

/** Tokens in order, which BM25 needs — term frequency is part of the score. */
export function tokenList(text: string): string[] {
  return normaliseText(text)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map(stem)
}

/** The distinct tokens in a text. */
export function tokenize(text: string): Set<string> {
  return new Set(tokenList(text))
}

/**
 * Overlap as a fraction of the query. Retained because the explanation shown
 * to the person is "you used these same words", which is a coverage question
 * rather than a ranking one.
 */
export function overlap(query: Set<string>, document: Set<string>): number {
  if (query.size === 0) return 0
  let shared = 0
  for (const token of query) if (document.has(token)) shared += 1
  return shared / query.size
}

/** The words a query and a document actually share, for the "why" line. */
export function sharedTerms(query: Set<string>, document: Set<string>): string[] {
  const shared: string[] = []
  for (const token of query) if (document.has(token)) shared.push(token)
  return shared
}

/* -------------------------------------------------------------------- BM25 */

export interface LexicalDocument {
  id: string
  terms: Map<string, number>
  length: number
  tokens: Set<string>
}

export interface LexicalIndex {
  documents: LexicalDocument[]
  /** Documents containing each term. */
  documentFrequency: Map<string, number>
  averageLength: number
}

/** Standard BM25 parameters; b=0.75 is the usual length normalisation. */
const K1 = 1.2
const B = 0.75

export function buildLexicalIndex(entries: readonly { id: string; text: string }[]): LexicalIndex {
  const documents: LexicalDocument[] = entries.map((entry) => {
    const tokens = tokenList(entry.text)
    const terms = new Map<string, number>()
    for (const token of tokens) terms.set(token, (terms.get(token) ?? 0) + 1)
    return { id: entry.id, terms, length: tokens.length, tokens: new Set(tokens) }
  })

  const documentFrequency = new Map<string, number>()
  for (const document of documents) {
    for (const term of document.terms.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
    }
  }

  const totalLength = documents.reduce((total, document) => total + document.length, 0)

  return {
    documents,
    documentFrequency,
    averageLength: documents.length > 0 ? totalLength / documents.length : 0,
  }
}

/**
 * Robertson-Sparck-Jones IDF with the +0.5 smoothing, floored at zero.
 *
 * Unfloored, a term appearing in more than half the corpus scores *negative*,
 * so an entry could be pushed down the list for containing a word the person
 * asked about. In a corpus of forty diary entries that is not a hypothetical:
 * "work" or "tired" can easily pass half.
 */
function inverseDocumentFrequency(index: LexicalIndex, term: string): number {
  const containing = index.documentFrequency.get(term) ?? 0
  const total = index.documents.length
  return Math.max(0, Math.log(1 + (total - containing + 0.5) / (containing + 0.5)))
}

/**
 * How much of a question a document covers, 0-1, on BM25's own terms.
 *
 * `overlap` counts shared words and treats them as equal, which is how a page
 * about hearing aids came to be cited for "I think I might be depressed": it
 * contained "think" and "might", and two words out of three looked like
 * two-thirds relevant. Every unrelated citation people saw traces back to that
 * arithmetic.
 *
 * This is BM25's numerator divided by the most any document could score on the
 * same question, which buys the two properties overlap lacks:
 *
 *   rarity        a shared "depressed" outweighs a shared "think", because
 *                 IDF says so — the same weighting the ranking already uses.
 *   length        a long document is not relevant merely for being long. Term
 *                 saturation and the b=0.75 length normalisation are what stop
 *                 a 700-word page from containing everyone's question.
 *
 * Using the ranker's own scoring for the *citation* decision also ends a
 * disagreement that used to cost good answers: retrieval ranked by BM25 and
 * then a different measure decided what could be cited, so the verifier would
 * reject documents retrieval had been confident about.
 */
export function coverage(
  index: LexicalIndex,
  document: LexicalDocument,
  query: readonly string[],
): number {
  if (index.averageLength === 0) return 0

  const normalisation = 1 - B + (B * document.length) / index.averageLength
  let score = 0
  let ceiling = 0

  for (const term of new Set(query)) {
    // Floored so a question made entirely of common words still divides by
    // something rather than reporting 0/0 as a perfect match.
    const weight = Math.max(0.05, inverseDocumentFrequency(index, term))
    ceiling += weight

    const frequency = document.terms.get(term)
    if (frequency) {
      /*
       * Clamped per term, which is the difference between coverage and
       * enthusiasm. BM25's saturation lets a term repeated often score up to
       * k1+1 = 2.2 times a single mention, so two words mentioned repeatedly
       * could out-score three words mentioned once — a document missing the
       * one word the question was about could reach 0.91 of a perfect match.
       * Capping each term at its own weight means a missing word always costs
       * its full share, and the result is genuinely "how much of this question
       * does this document address".
       */
      const saturation = (frequency * (K1 + 1)) / (frequency + K1 * normalisation)
      score += weight * Math.min(1, saturation)
    }
  }

  return ceiling === 0 ? 0 : score / ceiling
}

export function bm25(index: LexicalIndex, document: LexicalDocument, query: string[]): number {
  if (index.averageLength === 0) return 0

  let score = 0
  for (const term of query) {
    const frequency = document.terms.get(term)
    if (!frequency) continue

    const normalisation = 1 - B + (B * document.length) / index.averageLength
    score +=
      inverseDocumentFrequency(index, term) *
      ((frequency * (K1 + 1)) / (frequency + K1 * normalisation))
  }

  return score
}

/** Every document scored against a query, best first, zeroes dropped. */
export function bm25Ranking(
  index: LexicalIndex,
  query: string[],
): { id: string; score: number }[] {
  return index.documents
    .map((document) => ({ id: document.id, score: bm25(index, document, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
}
