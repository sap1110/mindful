import { expect, test } from '@playwright/test'
import { EVIDENCE_CORPUS } from '../src/lib/guide/evidence'
import { EVAL_CASES } from '../src/lib/guide/evaluation'
import { modelCard } from '../src/lib/guide/classifier'
import { classifyIntent } from '../src/lib/guide/intent'
import { classifyGuideRisk } from '../src/lib/guide/risk'
import { TRAINING_DATA } from '../src/lib/guide/training/dataset'
import { buildVectoriser, extractTerms, vectorise } from '../src/lib/guide/training/features'
import { fit, scoreClassification, shuffled } from '../src/lib/guide/training/logreg'

/**
 * The trained classifiers, and the integrity conditions around them.
 *
 * A model's headline metric is the least interesting thing about it. These
 * check the things that make the metric mean something: that it was not
 * measured on its own training data, that the safety rules still outrank it,
 * that it cannot lower a risk level, and that the corpus it retrieves from is
 * not quietly corrupt.
 */

test.describe('training integrity', () => {
  test('the evaluation set is disjoint from the training set', () => {
    // Training on the eval cases would turn every gate in guide-pipeline.spec
    // into a measurement of memorisation.
    const trained = new Set(TRAINING_DATA.map((example) => example.text.toLowerCase().trim()))
    const leaked = EVAL_CASES.filter((testCase) => trained.has(testCase.text.toLowerCase().trim()))

    expect(leaked.map((testCase) => testCase.text)).toEqual([])
  })

  test('no two training examples disagree with themselves', () => {
    const byText = new Map<string, { intent: string; risk: string }>()
    const contradictions: string[] = []

    for (const example of TRAINING_DATA) {
      const key = example.text.toLowerCase().trim()
      const seen = byText.get(key)
      if (seen && (seen.intent !== example.intent || seen.risk !== example.risk)) {
        contradictions.push(example.text)
      }
      byText.set(key, { intent: example.intent, risk: example.risk })
    }

    expect(contradictions).toEqual([])
  })

  test('the published metrics are the ones the artefacts carry', () => {
    const intent = modelCard('intent', 'embedding')
    const risk = modelCard('risk', 'embedding')

    // Floors, not targets — they exist to catch a regression in the data or
    // the hyperparameters, and they sit below where training currently lands.
    expect(intent.metrics.macroF1).toBeGreaterThanOrEqual(0.8)
    expect(risk.metrics.macroF1).toBeGreaterThanOrEqual(0.65)

    // The held-out set is real and was never trained on.
    expect(intent.metrics.heldOut).toBeGreaterThan(60)
    expect(intent.metrics.trainedOn).toBeGreaterThan(200)

    // The limitation travels with the artefact.
    expect(intent.provenance).toContain('not on any real user data')
    expect(intent.encoder).toBe('Xenova/all-MiniLM-L6-v2')
  })

  test('the embedding head beats the lexical head, and both are published', () => {
    const embedding = modelCard('intent', 'embedding').metrics.macroF1
    const lexical = modelCard('intent', 'lexical').metrics.macroF1

    expect(embedding).toBeGreaterThan(lexical)
    // The weaker number is not hidden: the app reports which head answered.
    expect(lexical).toBeGreaterThan(0.5)
  })
})

test.describe('the rules still outrank the model', () => {
  test('a diagnosis request is refused however confident the classifier is', () => {
    for (const phrase of [
      'diagnose me please',
      'tell me exactly what is wrong with me',
      'do I have diabetes',
    ]) {
      const result = classifyIntent(phrase)
      expect(result.intent, phrase).toBe('out-of-scope')
      expect(result.rule, phrase).not.toBeNull()
    }
  })

  test('a dosage question always lands in the medication lane', () => {
    for (const phrase of [
      'how many mg of ibuprofen can I take',
      'can I take paracetamol and ibuprofen together',
      'should I stop taking my antidepressants',
    ]) {
      const result = classifyIntent(phrase)
      expect(result.intent, phrase).toBe('medication')
      expect(result.rule, phrase).not.toBeNull()
    }
  })

  test('the trained head may raise a risk level but never lower one', () => {
    // Every rule-detected emergency stays an emergency, whatever the model says.
    for (const phrase of [
      'crushing chest pain spreading to my arm',
      'stiff neck with a fever and a rash',
      'back pain and I cannot control my bladder',
      'my newborn has a fever of 38.5',
    ]) {
      expect(classifyGuideRisk(phrase).level, phrase).toBe('high')
    }
  })

  test('the model cannot reach high risk on its own', () => {
    // Its held-out F1 on that class is 0.40; an emergency route needs a
    // pattern a person can read, not a probability.
    const raised = TRAINING_DATA.filter((example) => {
      const result = classifyGuideRisk(example.text)
      return result.raisedByModel === true
    })

    for (const example of raised) {
      expect(classifyGuideRisk(example.text).level, example.text).not.toBe('high')
    }
  })
})

test.describe('the evidence corpus is sound', () => {
  test('every document id is unique', () => {
    // MedQuAD reuses question_id across collections, which once put two
    // different documents under one id and made the verifier reject a good
    // answer for citing "the wrong" body.
    const counts = new Map<string, number>()
    for (const doc of EVIDENCE_CORPUS) counts.set(doc.id, (counts.get(doc.id) ?? 0) + 1)

    const duplicates = [...counts.entries()].filter(([, count]) => count > 1)
    expect(duplicates.map(([id]) => id)).toEqual([])
  })

  test('every document carries the metadata a citation needs', () => {
    for (const doc of EVIDENCE_CORPUS) {
      expect(doc.org, doc.id).toBeTruthy()
      expect(doc.title, doc.id).toBeTruthy()
      // https only: an http citation leaks the page in cleartext.
      expect(doc.url, doc.id).toMatch(/^https:\/\//)
      expect(doc.retrieved, doc.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(doc.body.length, doc.id).toBeGreaterThan(60)
    }
  })

  test('the corpus is large enough to answer beyond the hand-written topics', () => {
    expect(EVIDENCE_CORPUS.length).toBeGreaterThan(250)
    const topics = new Set(EVIDENCE_CORPUS.map((doc) => doc.topic))
    expect(topics.size).toBeGreaterThan(30)
  })
})

test.describe('the learning algorithm itself', () => {
  test('separates two classes it has actually been shown', () => {
    const examples = [
      ...Array.from({ length: 12 }, (_, index) => ({
        text: `my head hurts badly today number ${index}`,
        label: 0,
      })),
      ...Array.from({ length: 12 }, (_, index) => ({
        text: `how much water should adults drink daily number ${index}`,
        label: 1,
      })),
    ]

    const vectoriser = buildVectoriser(examples.map((example) => example.text))
    const { weights, bias } = fit(
      examples.map((example) => vectorise(vectoriser, example.text)),
      examples.map((example) => example.label),
      2,
      vectoriser.vocabulary.length,
      { epochs: 800, learningRate: 3 },
    )

    const predict = (text: string) => {
      const vector = vectorise(vectoriser, text)
      const scores = [0, 1].map((klass) => {
        let score = bias[klass]
        for (let feature = 0; feature < vector.length; feature += 1) {
          score += weights[klass][feature] * vector[feature]
        }
        return score
      })
      return scores[1] > scores[0] ? 1 : 0
    }

    expect(predict('my head hurts')).toBe(0)
    expect(predict('how much water should I drink')).toBe(1)
  })

  test('features keep contractions equivalent, and include bigrams', () => {
    expect(extractTerms("I can't sleep")).toEqual(extractTerms('I cannot sleep'))
    expect(extractTerms('cannot sleep')).toContain('cannot_sleep')
  })

  test('the shuffle is seeded, so training is reproducible', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffled(items, 42)).toEqual(shuffled(items, 42))
    expect(shuffled(items, 42)).not.toEqual(shuffled(items, 43))
  })

  test('macro-F1 ignores classes with no support rather than scoring them zero', () => {
    const metrics = scoreClassification([0, 0, 1], [0, 0, 1], ['a', 'b', 'never-seen'])
    expect(metrics.macroF1).toBe(1)
  })
})
