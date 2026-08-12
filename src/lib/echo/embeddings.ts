/**
 * The on-device embedding model.
 *
 * `all-MiniLM-L6-v2`, quantised, is roughly 23MB and runs on WASM. That choice
 * is doing a lot of work: it needs no WebGPU, so it runs in Safari and Firefox
 * and on the phone most people would actually use this on, and it is small
 * enough that the one-time download is a decision someone can say yes to
 * without thinking hard. A generative model capable of holding a conversation
 * would have been closer to 900MB and WebGPU-only, and it would have been able
 * to invent things about a person's mental health. This cannot: it turns text
 * into a vector, and that is the entire extent of its powers.
 *
 * On the network promise. Mindful says nothing leaves the device, and that
 * stays true here. The weights are fetched once from a CDN and cached by the
 * browser; after that the feature works offline. What never happens, at any
 * point, is the reverse direction — no journal entry, no mood note, no query,
 * no embedding and no telemetry is ever sent anywhere. Downloading a
 * dictionary is not the same as posting your diary, and the consent screen
 * says so in those terms rather than hiding the distinction.
 *
 * The model is loaded lazily and only after an explicit yes. Nothing here runs
 * on page load.
 */

import type { FeatureExtractionPipeline } from '@huggingface/transformers'

/**
 * Roughly what the browser fetches in total, for the consent screen.
 *
 * Two things, not one: the ONNX runtime that executes the model (~23MB raw,
 * around 6MB over the wire once compressed) and the quantised weights
 * themselves (~23MB, already compressed). Quoting only the model size would
 * have been the convenient number rather than the true one, and this figure
 * appears on a screen whose whole purpose is not doing that.
 */
export const MODEL_DOWNLOAD_MB = 30

export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'

/** MiniLM-L6 produces 384-dimensional sentence vectors. */
export const EMBEDDING_DIM = 384

export type EngineStatus =
  | { state: 'idle' }
  | { state: 'loading'; progress: number }
  | { state: 'ready' }
  /** Kept as a value, not thrown: the app has a real feature to fall back to. */
  | { state: 'unavailable'; reason: string }

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null

/**
 * Whether this browser can run the model at all.
 *
 * WASM is close to universal, so this is a low bar by design — the point of
 * choosing MiniLM was to make it one. `WebAssembly` missing means a browser old
 * enough that the fallback is the right experience anyway.
 */
export function isSupported(): boolean {
  return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function'
}

/**
 * Load the model, reporting progress.
 *
 * Concurrent callers share one in-flight promise: two components asking at once
 * must not start two 23MB downloads. A failed load clears the cached promise so
 * a later retry is genuinely a retry rather than a replay of the same rejection.
 */
export async function loadEmbedder(
  onProgress?: (fraction: number) => void,
): Promise<FeatureExtractionPipeline> {
  if (pipelinePromise) return pipelinePromise

  pipelinePromise = (async () => {
    // Imported here rather than at module scope so the library is not in the
    // initial bundle for the screens that never touch it.
    const { pipeline } = await import('@huggingface/transformers')

    return pipeline('feature-extraction', MODEL_ID, {
      dtype: 'q8',
      progress_callback: (report: unknown) => {
        if (!onProgress) return
        const item = report as { status?: string; progress?: number }
        if (item.status === 'progress' && typeof item.progress === 'number') {
          onProgress(Math.min(1, Math.max(0, item.progress / 100)))
        }
      },
    })
  })()

  try {
    return await pipelinePromise
  } catch (error) {
    pipelinePromise = null
    throw error
  }
}

/**
 * Embed a batch of strings into unit-length vectors.
 *
 * Mean pooling then L2 normalisation is the documented recipe for this model,
 * and normalising here means similarity downstream is a plain dot product —
 * see `retrieve.ts`, which relies on that.
 */
export async function embed(
  texts: readonly string[],
  onProgress?: (fraction: number) => void,
): Promise<Float32Array[]> {
  if (texts.length === 0) return []

  const extractor = await loadEmbedder(onProgress)
  const output = await extractor(texts as string[], { pooling: 'mean', normalize: true })

  const flat = output.data as Float32Array
  const vectors: Float32Array[] = []
  for (let i = 0; i < texts.length; i += 1) {
    vectors.push(flat.slice(i * EMBEDDING_DIM, (i + 1) * EMBEDDING_DIM) as Float32Array)
  }

  return vectors
}

/** Embed one string. Convenience for the query side, which is always singular. */
export async function embedOne(text: string): Promise<Float32Array> {
  const [vector] = await embed([text])
  return vector
}
