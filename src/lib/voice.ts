/**
 * The spoken guide's engine.
 *
 * Mindful's promise is that nothing leaves the device, and a voice is the
 * easiest place in an app like this to break that promise — every hosted
 * text-to-speech API would ship the words off to someone's server. So the guide
 * uses the browser's own `SpeechSynthesis`, and takes only voices the platform
 * reports as `localService`. Cloud-backed voices (Chrome's "Google …" set,
 * Windows' "… Online" set) are filtered out rather than merely deprioritised,
 * because a voice that sounds slightly nicer is not worth a network request
 * made on behalf of someone who was told there would be none.
 *
 * Everything here degrades: a browser with no synthesis, or no local voice
 * installed, simply reports `supported: false` and the screen carries on
 * working exactly as it did before the voice existed.
 */

export interface GuideVoice {
  /** Stable across a session; the platform's URI, or the name as a fallback. */
  id: string
  name: string
  lang: string
}

/**
 * Voices that read a slow instruction kindly rather than like a station
 * announcement, best-first per platform. Anything not on the list still shows
 * up in the picker — this only decides what is offered by default.
 */
const PREFERRED_NAMES = [
  // macOS / iOS
  'samantha',
  'ava',
  'allison',
  'serena',
  'karen',
  'moira',
  'daniel',
  // Windows
  'aria',
  'jenny',
  'sonia',
  'hazel',
  'zira',
  // Android / Chrome OS
  'english (united kingdom)',
  'english (united states)',
]

/** Names that mean "synthesised somewhere else". Never offered. */
const REMOTE_MARKERS = ['online', 'network', 'cloud', 'remote', 'google']

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

function isOnDevice(voice: SpeechSynthesisVoice): boolean {
  if (!voice.localService) return false
  const name = voice.name.toLowerCase()
  return !REMOTE_MARKERS.some((marker) => name.includes(marker))
}

function voiceId(voice: SpeechSynthesisVoice): string {
  return voice.voiceURI || voice.name
}

/**
 * Lower sorts earlier. Neural voices first wherever one is installed, then the
 * preferred-name list, then the rest alphabetically.
 *
 * The "natural" check matters more than the whole list below it. Windows 11
 * and recent macOS let people install neural voices that run fully on-device —
 * they appear as `localService` without the "Online" marker, so they pass the
 * privacy filter — and next to one of those every legacy voice sounds like a
 * station announcement. If someone has installed one, it is unquestionably
 * what they want leading a breathing session.
 */
function rank(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  if (name.includes('natural') || name.includes('neural') || name.includes('premium')) return -1
  const index = PREFERRED_NAMES.findIndex((preferred) => name.includes(preferred))
  return index === -1 ? PREFERRED_NAMES.length : index
}

export function isSpeechSupported(): boolean {
  return synth() !== null
}

/**
 * Every on-device voice worth offering, calmest first.
 *
 * English only where English exists: the cues are written in English, and a
 * voice for another language reads them as nonsense. Where a device has local
 * voices but none in English, all of them are returned so the choice is the
 * person's rather than ours.
 */
export function listVoices(): GuideVoice[] {
  const speech = synth()
  if (!speech) return []

  const local = speech.getVoices().filter(isOnDevice)
  const english = local.filter((voice) => voice.lang.toLowerCase().startsWith('en'))
  const offered = english.length > 0 ? english : local

  return [...offered]
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .map((voice) => ({ id: voiceId(voice), name: voice.name, lang: voice.lang }))
}

/**
 * Chrome populates the voice list asynchronously, so a first call can honestly
 * return nothing. Subscribe, re-read, and the picker fills itself in.
 */
export function onVoicesChanged(listener: () => void): () => void {
  const speech = synth()
  if (!speech) return () => {}

  speech.addEventListener('voiceschanged', listener)
  return () => speech.removeEventListener('voiceschanged', listener)
}

function findVoice(id: string | null): SpeechSynthesisVoice | null {
  const speech = synth()
  if (!speech) return null

  const local = speech.getVoices().filter(isOnDevice)
  if (id) {
    const chosen = local.find((voice) => voiceId(voice) === id)
    if (chosen) return chosen
  }

  const english = local.filter((voice) => voice.lang.toLowerCase().startsWith('en'))
  const pool = english.length > 0 ? english : local
  return [...pool].sort((a, b) => rank(a) - rank(b))[0] ?? null
}

export interface SpeakOptions {
  voiceId?: string | null
  /** 1 is the platform default; the guide runs slower than conversation. */
  rate?: number
  pitch?: number
  /** Stop whatever is mid-sentence first. On by default: cues must not queue. */
  interrupt?: boolean
}

/**
 * Near-normal delivery, with the calm coming from punctuation rather than
 * from dragging the rate.
 *
 * The first version ran at 0.82× and slightly below default pitch, on the
 * theory that slower means calmer. On the legacy voices most machines actually
 * have, it means the opposite: concatenative synthesis stretched below its
 * recorded speed smears into a slur, which reads as unsettling rather than
 * soothing. Engines pause naturally at commas and full stops, so the pacing
 * now lives in the text (see `soften`) while the voice speaks at a rate it was
 * built for.
 */
export const CALM_RATE = 0.95
export const CALM_PITCH = 1

/**
 * Rewrite a cue into the punctuation speech engines handle gracefully.
 *
 * Em and en dashes are the main offender: written for the eye, they make some
 * engines lurch or read them out, where a comma produces exactly the gentle
 * pause the dash meant. Ellipses similarly. The written copy on screen keeps
 * its dashes; only the spoken form is softened.
 */
function soften(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s*\.\.\.\s*|…/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim()
}

/**
 * Kept alive for the length of the utterance. Chrome can garbage-collect an
 * unreferenced `SpeechSynthesisUtterance` mid-sentence, which cuts the voice
 * off and loses the `end` event with it.
 */
let active: SpeechSynthesisUtterance | null = null

/**
 * Say one line, resolving when it has finished.
 *
 * Callers use that resolution to sequence — the lead-in finishes speaking
 * before the session clock starts — so it must always settle. A synthesis that
 * errors, is cancelled, or simply never reports back resolves anyway, on a
 * generous estimate of how long the line should have taken.
 */
export function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  const speech = synth()
  if (!speech || !text) return Promise.resolve()

  // No on-device voice means no voice at all. Leaving `utterance.voice` unset
  // would let the platform pick, and on some builds the platform picks a
  // cloud-backed one — the exact thing this module exists to prevent.
  const voice = findVoice(options.voiceId ?? null)
  if (!voice) return Promise.resolve()

  const { rate = CALM_RATE, pitch = CALM_PITCH, interrupt = true } = options
  if (interrupt) speech.cancel()

  const spoken = soften(text)

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(spoken)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = 1

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (active === utterance) active = null
      resolve()
    }

    // Roughly 12 characters a second at rate 1, plus headroom. Only ever
    // reached when the platform loses the utterance; the events win normally.
    const estimate = ((spoken.length / 12) * 1000) / Math.max(rate, 0.5) + 4_000
    const timer = window.setTimeout(finish, estimate)

    utterance.onend = finish
    utterance.onerror = finish

    active = utterance
    speech.speak(utterance)
  })
}

/** Cut the voice off — leaving a screen, stopping a session, unmounting. */
export function stopSpeaking(): void {
  const speech = synth()
  if (!speech) return
  active = null
  speech.cancel()
}
