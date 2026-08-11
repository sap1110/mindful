import { useSyncExternalStore } from 'react'
import { getSnapshot, subscribe, type MindfulData } from '../lib/storage'

/**
 * The on-device dataset, as a live value.
 *
 * `useSyncExternalStore` rather than a context provider: storage *is* the
 * source of truth, so there is nothing to duplicate into React state, and a
 * write from any screen (or another tab) reaches every subscriber without a
 * provider having to sit above them all.
 */
export function useMindfulData(): MindfulData {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
