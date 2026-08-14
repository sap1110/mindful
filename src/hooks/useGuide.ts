import { useCallback, useRef, useState } from 'react'
import { embed, embedOne, isSupported, type EngineStatus } from '../lib/echo/embeddings'
import { EVIDENCE_CORPUS, evidenceEmbeddingText, type EvidenceDoc } from '../lib/guide/evidence'
import { runGuidePipeline, type GuideAnswer } from '../lib/guide/pipeline'

export interface UseGuide {
  status: EngineStatus
  /** Download the model and index the evidence base. Only ever from a click. */
  enable: () => Promise<void>
  ask: (text: string) => Promise<void>
  answer: GuideAnswer | null
  thinking: boolean
  clear: () => void
}

/**
 * Ask's state: one pipeline, two retrieval modes.
 *
 * The same on-device embedding model Echo uses can serve as Ask's dense arm —
 * one 30MB download upgrades both features, which is the only way a download
 * that size earns its keep. Without it, the pipeline runs lexical-only, which
 * is the mode the entire evaluation suite runs in: the safety rails (risk,
 * intent rules, verification) are identical on both paths and depend on no
 * download having happened.
 *
 * The evidence index is vectors over the *published corpus*, not over anything
 * the person wrote — so unlike Echo's index there is nothing personal in it —
 * but it is still built lazily and held in memory only, because a cache is a
 * thing that has to be explained and this one is cheap to rebuild.
 */
export function useGuide(): UseGuide {
  const [status, setStatus] = useState<EngineStatus>(
    isSupported() ? { state: 'idle' } : { state: 'unavailable', reason: 'no-wasm' },
  )
  const [answer, setAnswer] = useState<GuideAnswer | null>(null)
  const [thinking, setThinking] = useState(false)

  const indexRef = useRef<{ doc: EvidenceDoc; vector: Float32Array }[] | null>(null)

  const buildIndex = useCallback(async () => {
    if (indexRef.current) return indexRef.current
    const vectors = await embed(EVIDENCE_CORPUS.map(evidenceEmbeddingText))
    indexRef.current = EVIDENCE_CORPUS.map((doc, index) => ({ doc, vector: vectors[index] }))
    return indexRef.current
  }, [])

  const enable = useCallback(async () => {
    if (!isSupported()) {
      setStatus({ state: 'unavailable', reason: 'no-wasm' })
      return
    }

    setStatus({ state: 'loading', progress: 0 })
    try {
      await embed(['warming up'], (fraction) => setStatus({ state: 'loading', progress: fraction }))
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

      // The lexical path answers immediately and depends on nothing.
      if (status.state !== 'ready') {
        setAnswer(runGuidePipeline({ query: trimmed }))
        return
      }

      setThinking(true)
      try {
        const docs = await buildIndex()
        const queryVector = await embedOne(trimmed)
        setAnswer(runGuidePipeline({ query: trimmed, dense: { queryVector, docs } }))
      } catch {
        // A mid-session model failure must not lose the question.
        setAnswer(runGuidePipeline({ query: trimmed }))
      } finally {
        setThinking(false)
      }
    },
    [buildIndex, status.state],
  )

  return { status, enable, ask, answer, thinking, clear: () => setAnswer(null) }
}
