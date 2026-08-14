import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isSpeechSupported, listVoices, onVoicesChanged, speak, stopSpeaking } from '../lib/voice'
import type { GuideVoice } from '../lib/voice'
import { readVoicePrefs, saveVoicePrefs, type VoicePrefs } from '../lib/storage'

export interface VoiceGuide {
  /** The browser can speak at all. */
  speechSupported: boolean
  /** The browser can speak *and* has an on-device voice to do it with. */
  available: boolean
  voices: GuideVoice[]
  /** The voice that would be used right now, resolved through the default. */
  currentVoice: GuideVoice | null
  prefs: VoicePrefs
  setEnabled: (enabled: boolean) => void
  setVoiceId: (id: string | null) => void
  setEyesClosed: (eyesClosed: boolean) => void
  /** Record that the eyes-closed safety checks have been read and confirmed. */
  acknowledgeEyesClosed: () => void
  /** Speak a cue — a no-op unless the guide is both switched on and available. */
  say: (text: string) => Promise<void>
  /** Speak regardless of the switch, for the "hear this voice" button. */
  preview: (text: string) => Promise<void>
  stop: () => void
}

/**
 * The spoken guide's state: what this device can say, and how the person
 * wants it said.
 *
 * Voice lists arrive asynchronously in Chrome — the first `getVoices()` after
 * page load routinely returns nothing — so the list is re-read on the
 * `voiceschanged` event and once more shortly after mount, rather than being
 * read once and believed.
 *
 * `say` swallows the "off" case itself so callers never have to branch: the
 * breathing screen calls it at the top of every phase whether or not anyone is
 * listening, and gets a resolved promise back when they are not.
 */
export function useVoiceGuide(): VoiceGuide {
  const [voices, setVoices] = useState<GuideVoice[]>(() => listVoices())
  const [prefs, setPrefs] = useState<VoicePrefs>(readVoicePrefs)

  const speechSupported = useMemo(isSpeechSupported, [])

  // Read by `say` without making every cue depend on the latest render.
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    if (!speechSupported) return

    const sync = () => setVoices(listVoices())
    sync()

    const unsubscribe = onVoicesChanged(sync)
    // Some builds populate the list without ever firing the event.
    const retry = window.setTimeout(sync, 600)

    return () => {
      unsubscribe()
      window.clearTimeout(retry)
    }
  }, [speechSupported])

  // Nothing should still be talking after this screen goes away.
  useEffect(() => stopSpeaking, [])

  const persist = useCallback((next: VoicePrefs) => {
    setPrefs(next)
    saveVoicePrefs(next)
  }, [])

  const setEnabled = useCallback(
    (enabled: boolean) => {
      const current = prefsRef.current
      if (!enabled) stopSpeaking()
      // Eyes-closed mode is the voice leading the whole session; without a
      // voice it would be a dark screen and no guidance at all.
      persist({ ...current, enabled, eyesClosed: enabled ? current.eyesClosed : false })
    },
    [persist],
  )

  const setVoiceId = useCallback(
    (voiceId: string | null) => persist({ ...prefsRef.current, voiceId }),
    [persist],
  )

  const setEyesClosed = useCallback(
    (eyesClosed: boolean) => persist({ ...prefsRef.current, eyesClosed }),
    [persist],
  )

  const acknowledgeEyesClosed = useCallback(
    () => persist({ ...prefsRef.current, eyesClosedAcknowledged: true }),
    [persist],
  )

  const available = speechSupported && voices.length > 0

  const currentVoice = useMemo(() => {
    if (voices.length === 0) return null
    return voices.find((voice) => voice.id === prefs.voiceId) ?? voices[0]
  }, [voices, prefs.voiceId])

  const say = useCallback(async (text: string) => {
    const current = prefsRef.current
    if (!current.enabled || !text) return
    await speak(text, { voiceId: current.voiceId })
  }, [])

  const preview = useCallback(
    (text: string) => speak(text, { voiceId: prefsRef.current.voiceId }),
    [],
  )

  return {
    speechSupported,
    available,
    voices,
    currentVoice,
    prefs,
    setEnabled,
    setVoiceId,
    setEyesClosed,
    acknowledgeEyesClosed,
    say,
    preview,
    stop: stopSpeaking,
  }
}
