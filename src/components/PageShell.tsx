import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'
import { AmbientBackdrop } from './AmbientBackdrop'
import { Disclaimer } from './Disclaimer'
import { Logo } from './Logo'

export interface PageShellProps {
  children: ReactNode
  /** Rendered at the right of the header — usually a single quiet action. */
  headerActions?: ReactNode
  /** How prominent the ambient wash should be behind the page. */
  backdrop?: 'hero' | 'calm'
  /**
   * Every screen carries the "not medical advice" notice. `panel` is the full
   * statement with crisis routing; `note` is the single-line version.
   */
  disclaimer?: 'note' | 'panel'
  /** Constrain the main column. `wide` is for the landing hero. */
  width?: 'narrow' | 'wide'
  /**
   * The persistent section bar for signed-in screens. Rendered after the
   * footer and given room by padding the page, so a fixed bar never covers
   * the disclaimer.
   */
  nav?: ReactNode
  className?: string
}

/**
 * The frame every route sits in: skip link, ambient backdrop, masthead, one
 * `<main id="main">` landmark, and the mandatory health disclaimer in the
 * footer. Keeping the disclaimer here is deliberate — it cannot be forgotten
 * on a new screen.
 */
export function PageShell({
  children,
  headerActions,
  backdrop = 'calm',
  disclaimer = 'note',
  width = 'narrow',
  nav,
  className,
}: PageShellProps) {
  return (
    <div className={cn('relative flex min-h-dvh flex-col', nav && 'pb-24 sm:pb-28')}>
      <AmbientBackdrop intensity={backdrop} />

      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="relative z-10 px-5 pt-6 sm:px-8 sm:pt-8">
        <div
          className={cn(
            'mx-auto flex w-full items-center justify-between gap-4',
            width === 'wide' ? 'max-w-6xl' : 'max-w-3xl',
          )}
        >
          <Link
            to="/"
            className="rounded-lg transition-opacity hover:opacity-80"
            aria-label="Mindful — home"
          >
            <Logo />
          </Link>
          {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className={cn(
          'relative z-10 mx-auto w-full flex-1 px-5 py-10 focus:outline-none sm:px-8 sm:py-14',
          width === 'wide' ? 'max-w-6xl' : 'max-w-3xl',
          className,
        )}
      >
        {children}
      </main>

      <footer className="relative z-10 px-5 pb-8 sm:px-8 sm:pb-10">
        <div
          className={cn(
            'mx-auto w-full',
            width === 'wide' ? 'max-w-6xl' : 'max-w-3xl',
          )}
        >
          <div className="mb-6 h-px rule-fade" />
          <Disclaimer variant={disclaimer} />
          <p className="mt-5 text-xs text-text-subtle">
            Mindful keeps everything you enter in this browser, on this device. No account, no
            server, no analytics.
          </p>
        </div>
      </footer>

      {nav}
    </div>
  )
}

export default PageShell
