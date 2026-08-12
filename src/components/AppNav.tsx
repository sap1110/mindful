import { ClipboardCheck, History, House, NotebookPen, Settings, Smile, Wind } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'

const ITEMS = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/mood', label: 'Mood', icon: Smile },
  { to: '/self-check', label: 'Check', icon: ClipboardCheck },
  { to: '/echo', label: 'Echo', icon: History },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
  { to: '/breathe', label: 'Breathe', icon: Wind },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

/**
 * The persistent bottom bar for the signed-in screens.
 *
 * Mobile-first: a full-width bar pinned to the bottom edge with a safe-area
 * inset, becoming a centred floating pill from `sm` up. Every destination is a
 * real link inside a labelled `<nav>`, so the current page is announced via
 * `aria-current` and the whole bar is one tab stop per item — no roving
 * tabindex, no custom key handling to get wrong.
 *
 * The label is always visible: an icon on its own would fail both the
 * "never colour or icon alone" rule and anyone who does not recognise a
 * pictogram of wind.
 */
export function AppNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Sections"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]',
        'border-t border-border bg-surface/92 backdrop-blur-md',
        'sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-auto sm:-translate-x-1/2',
        'sm:rounded-pill sm:border sm:bg-surface/95 sm:shadow-lift',
        className,
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 sm:gap-1 sm:px-2">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1 sm:flex-none">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  // Six destinations have to fit a 375px phone, so the mobile
                  // label runs tight and unpadded; from `sm` up there is room
                  // for the roomier pill treatment.
                  'group flex h-full min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-2',
                  'text-2xs font-medium tracking-normal transition-colors duration-250 ease-calm',
                  'sm:min-h-12 sm:flex-row sm:gap-2 sm:rounded-pill sm:px-4 sm:tracking-[0.02em] sm:text-sm',
                  isActive
                    ? 'text-primary'
                    : 'text-text-subtle hover:bg-surface-muted hover:text-text',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-7 w-9 items-center justify-center rounded-pill transition-colors duration-250 ease-calm',
                      'sm:h-6 sm:w-6',
                      isActive ? 'bg-primary-soft sm:bg-transparent' : 'bg-transparent',
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={isActive ? 2.2 : 1.8} />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default AppNav
