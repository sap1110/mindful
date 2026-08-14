import { useEffect } from 'react'

/**
 * Keep the screen awake while something is `active`.
 *
 * An eyes-closed session is several minutes with no touches, which is exactly
 * what a phone reads as "put yourself to sleep" — and a device locking itself
 * silences the guide mid-breath. The Screen Wake Lock API is entirely local:
 * it asks this device to stay on, and nothing else.
 *
 * Unsupported browsers, denied requests and locks dropped when the tab is
 * hidden are all non-events; the session carries on, it simply cannot promise
 * the screen stays lit. Locks *are* released by the platform whenever the page
 * is hidden, so the request is made again on the way back.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let released = false

    const request = async () => {
      if (released || document.visibilityState !== 'visible') return
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch {
        /* Denied, or the battery is too low for it. Not worth telling anyone. */
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}
