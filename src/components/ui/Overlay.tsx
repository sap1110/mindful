import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

export interface OverlayProps {
  /** The dialog's accessible name. Use `labelledBy` instead when a heading exists. */
  label?: string
  /** Id of the heading that names this dialog. */
  labelledBy?: string
  /** Escape, and whatever else should close it. Omit to make it undismissable. */
  onDismiss?: () => void
  /**
   * The page behind is completely covered, so hide it rather than merely
   * painting over it. See the note below on why that is not just tidiness.
   */
  opaque?: boolean
  className?: string
  children: ReactNode
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The modal shell: portal, focus trap, and a page that genuinely goes away.
 *
 * Rendered through a portal into `<body>` rather than in place. A modal that
 * lives inside the page inherits its stacking contexts, and this app has
 * several — the shell's footer sits above content on purpose — so an in-place
 * overlay ends up visually on top while the footer still swallows clicks
 * through it. A portal has no such argument to lose.
 *
 * While one of these is open the app root is marked `inert` and
 * `aria-hidden`, so the page underneath cannot be tabbed into, read by a
 * screen reader, or clicked. `opaque` goes one step further and hides it
 * outright, which matters for more than tidiness: an overlay that merely
 * *paints* over the page leaves the text beneath it still on screen as far as
 * anything measuring is concerned, and a contrast checker will correctly
 * report a page full of dark-on-dark text that nobody can see. Hiding it says
 * what is actually true — during an eyes-closed session, there is no page.
 */
export function Overlay({
  label,
  labelledBy,
  onDismiss,
  opaque,
  className,
  children,
}: OverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = document.getElementById('root')
    const previouslyFocused = document.activeElement as HTMLElement | null

    root?.setAttribute('inert', '')
    root?.setAttribute('aria-hidden', 'true')
    if (opaque && root) root.style.display = 'none'

    const container = containerRef.current
    const first = container?.querySelector<HTMLElement>('[data-autofocus]')
    ;(first ?? container?.querySelector<HTMLElement>(FOCUSABLE))?.focus()

    return () => {
      root?.removeAttribute('inert')
      root?.removeAttribute('aria-hidden')
      if (opaque && root) root.style.display = ''
      previouslyFocused?.focus?.()
    }
  }, [opaque])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onDismiss) {
        event.preventDefault()
        onDismiss()
        return
      }

      if (event.key !== 'Tab') return

      // Keep the keyboard inside. The page behind is inert, so tabbing out of
      // here would land focus nowhere at all.
      const focusable = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      )
      if (focusable.length === 0) return

      event.preventDefault()
      const index = focusable.indexOf(document.activeElement as HTMLElement)
      const step = event.shiftKey ? -1 : 1
      const next = (index + step + focusable.length) % focusable.length
      focusable[index === -1 ? 0 : next]?.focus()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={cn('fixed inset-0 z-50', className)}
    >
      {children}
    </div>,
    document.body,
  )
}

export default Overlay
