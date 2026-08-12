import { useCallback, useMemo, useRef, useState } from 'react'
import { buildCorpus } from '../lib/echo/corpus'
import { embed, embedOne, isSupported, type EngineStatus } from '../lib/echo/embeddings'
import { keywordRetrieve } from '../lib/echo/keyword'
import { LIBRARY, libraryEmbeddingText } from '../lib/echo/library'
import {
  retrieve,
  summarise,
  type IndexedCard,
  type IndexedPassage,
  type RetrievalResult,
} from '../lib/echo/retrieve'
import { assessRisk, type RiskAssessment } from '../lib/echo/safety'
import { useMindfulData } from './useMindfulData'

/** Which engine produced an answer, so the UI can be honest about its limits. */
export type SearchMode = 'semantic' | 'keyword'

export interface Reflection {
  /** What was asked, kept so the answer can be shown against it. */
  query: string
  risk: RiskAssessment
  /** Absent when the risk assessment stopped the search before it began. */
  result: RetrievalResult | null
  summary: string
  mode: SearchMode
}

export interface UseEcho {
  status: EngineStatus
  /** True once the index is built and questions can be asked. */
  ready: boolean
  /** Downloads the model and builds the index. Only ever called from a click. */
  enable: () => Promise<void>
  ask: (text: string) => Promise<void>
  reflection: Reflection | null
  thinking: boolean
  clear: () => void
  /** How many of the person's own passages are searchable right now. */
  passageCount: number
}

/**
 * The reflection feature's state.
 *
 * Two things here are load-bearing.
 *
 * The risk assessment runs *before* the engine is consulted, and before
 * `ready` is even checked. Someone can type a disclosure into this box on a
 * device that never downloaded the model, and the crisis response has to work
 * there exactly as it does everywhere else. Making that path depend on a
 * 23MB download would be an unforgivable piece of engineering.
 *
 * The index is rebuilt from the live dataset rather than cached across
 * sessions. See `retrieve.ts` for why keeping vectors of someone's diary on
 * disk is a worse trade than recomputing them.
 */
export function useEcho(): UseEcho {
  const data = useMindfulData()
  const [status, setStatus] = useState<EngineStatus>(
    isSupported() ? { state: 'idle' } : { state: 'unavailable', reason: 'no-wasm' },
  )
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [thinking, setThinking] = useState(false)

  const passages = useMemo(() => buildCorpus(data), [data])

  const indexRef = useRef<{ passages: IndexedPassage[]; cards: IndexedCard[] } | null>(null)
  // The corpus this index was built from, so a new entry written since then
  // triggers a rebuild rather than being silently unsearchable.
  const indexedIdsRef = useRef<string>('')

  const buildIndex = useCallback(async () => {
    const signature = passages.map((passage) => passage.id).join('|')
    if (indexRef.current && indexedIdsRef.current === signature) return indexRef.current

    const cardTexts = LIBRARY.map(libraryEmbeddingText)
    const cardVectors = await embed(cardTexts)
    const cards: IndexedCard[] = LIBRARY.map((card, index) => ({
      card,
      vector: cardVectors[index],
    }))

    const passageVectors =
      passages.length > 0 ? await embed(passages.map((passage) => passage.text)) : []
    const indexedPassages: IndexedPassage[] = passages.map((passage, index) => ({
      passage,
      vector: passageVectors[index],
    }))

    indexRef.current = { passages: indexedPassages, cards }
    indexedIdsRef.current = signature
    return indexRef.current
  }, [passages])

  const enable = useCallback(async () => {
    if (!isSupported()) {
      setStatus({ state: 'unavailable', reason: 'no-wasm' })
      return
    }

    setStatus({ state: 'loading', progress: 0 })
    try {
      // Warm the model first so download progress is visible, then index.
      await embed(['warming up'], (fraction) =>
        setStatus({ state: 'loading', progress: fraction }),
      )
      await buildIndex()
      setStatus({ state: 'ready' })
    } catch (error) {
      setStatus({
        state: 'unavailable',
        reason: error instanceof Error ? error.message : 'load-failed',
      })
    }
  }, [buildIndex])

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (trimmed.length === 0) return

      // Before anything else, and independent of the model. See the note above.
      const risk = assessRisk(trimmed)
      if (risk.level === 'acute') {
        setReflection({ query: trimmed, risk, result: null, summary: '', mode: 'keyword' })
        return
      }

      // Without the model, answer with word overlap rather than not at all.
      // See `keyword.ts` — this is a supported path, not a degraded one.
      if (status.state !== 'ready') {
        const result = keywordRetrieve(trimmed, passages, data.moods)
        setReflection({
          query: trimmed,
          risk,
          result,
          summary: summarise(result, data),
          mode: 'keyword',
        })
        return
      }

      setThinking(true)
      try {
        const index = await buildIndex()
        const queryVector = await embedOne(trimmed)
        const result = retrieve(queryVector, index.passages, index.cards, data.moods)
        setReflection({
          query: trimmed,
          risk,
          result,
          summary: summarise(result, data),
          mode: 'semantic',
        })
      } catch {
        // A mid-session failure must not lose the person's question.
        const result = keywordRetrieve(trimmed, passages, data.moods)
        setReflection({
          query: trimmed,
          risk,
          result,
          summary: summarise(result, data),
          mode: 'keyword',
        })
      } finally {
        setThinking(false)
      }
    },
    [buildIndex, data, passages, status.state],
  )

  return {
    status,
    ready: status.state === 'ready',
    enable,
    ask,
    reflection,
    thinking,
    clear: () => setReflection(null),
    passageCount: passages.length,
  }
}
