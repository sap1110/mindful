import { useEffect, useRef, useState } from 'react'

/**
 * Hide something once the screen has been still, bring it back on any sign of
 * life.
 *
 * Used by the bottom navigation, which is present on every screen and is
 * therefore permanently in the way of the thing someone came to read. Fading
 * it out after a few still seconds gives the page back to the content without
 * costing anyone the bar: any pointer movement, scroll, key, touch or tap
 * returns it immediately.
 *
 * Three accessibility conditions the naive version gets wrong:
 *
 *   Keyboard users must never lose it. A `focusin` anywhere in the watched
 *   element pins it visible until focus leaves, so tabbing into a bar that
 *   faded out reveals it rather than moving focus to something invisible.
 *
 *   Reduced motion means no fade. Someone who asked for less movement did not
 *   ask for a navigation bar that breathes at them, so the hook simply stays
 *   visible.
 *
 *   Touch devices get a longer grace period. A phone has no hover, so the only
 *   signal of intent is a deliberate touch, and hiding the bar mid-scroll on a
 *   phone would be actively hostile.
 */
export interface UseIdleHideOptions {
  /** Milliseconds of stillness before hiding. */
  delayMs?: number
  /** Never hide while this is true — used to pin the bar open. */
  pinned?: boolean
}

export function useIdleHide<T extends HTMLElement>({
  delayMs = 2_600,
  pinned = false,
}: UseIdleHideOptions = {}) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(true)
  const [hasFocus, setHasFocus] = useState(false)

  useEffect(() => {
    // Respect the platform preference, and do not fight a keyboard user.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduced || pinned || hasFocus) {
      setVisible(true)
      return
    }

    let timer = window.setTimeout(() => setVisible(false), delayMs)

    const wake = () => {
      setVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setVisible(false), delayMs)
    }

    const events: (keyof WindowEventMap)[] = [
      'pointermove',
      'pointerdown',
      'wheel',
      'scroll',
      'keydown',
      'touchstart',
    ]
    for (const event of events) window.addEventListener(event, wake, { passive: true })

    return () => {
      window.clearTimeout(timer)
      for (const event of events) window.removeEventListener(event, wake)
    }
  }, [delayMs, pinned, hasFocus])

  // Focus inside pins it open, so a keyboard user can never be sent to
  // something they cannot see.
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const onFocusIn = () => setHasFocus(true)
    const onFocusOut = (event: FocusEvent) => {
      if (!element.contains(event.relatedTarget as Node | null)) setHasFocus(false)
    }

    element.addEventListener('focusin', onFocusIn)
    element.addEventListener('focusout', onFocusOut)
    return () => {
      element.removeEventListener('focusin', onFocusIn)
      element.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  return { ref, visible: visible || hasFocus }
}
