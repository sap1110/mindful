import {
  Brain,
  MessageCircleQuestion,
  ClipboardCheck,
  History,
  House,
  NotebookPen,
  Settings,
  Smile,
  Wind,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useIdleHide } from '../hooks/useIdleHide'
import { cn } from '../lib/cn'

const ITEMS = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/mood', label: 'Mood', icon: Smile },
  { to: '/self-check', label: 'Check', icon: ClipboardCheck },
  { to: '/echo', label: 'Echo', icon: History },
  { to: '/ask', label: 'Ask', icon: MessageCircleQuestion },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
  { to: '/breathe', label: 'Breathe', icon: Wind },
  { to: '/recovery', label: 'Recovery', icon: Brain },
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
 *
 * It fades out once the screen has been still for a few seconds and returns on
 * any pointer movement, scroll, key or touch. With nine destinations the bar is
 * a permanent stripe across the bottom of every screen, and the content is what
 * people came for — but it never goes away for a keyboard user, and never fades
 * at all under `prefers-reduced-motion`. See `useIdleHide`.
 */
export function AppNav({ className }: { className?: string }) {
  const { ref, visible } = useIdleHide<HTMLElement>()

  return (
    <nav
      ref={ref}
      aria-label="Sections"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]',
        'border-t border-border bg-surface/92 backdrop-blur-md',
        'sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-auto sm:-translate-x-1/2',
        'sm:rounded-pill sm:border sm:bg-surface/95 sm:shadow-lift',
        // Fade and drop away when idle. Still focusable while hidden — focus
        // pins it back open — so nothing becomes unreachable.
        'transition-[opacity,transform] duration-400 ease-calm',
        'motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0 hover:opacity-100',
        className,
      )}
    >
      {/*
        Nine destinations. The list sizes to its content and scrolls rather
        than clipping — an earlier `max-w-xl` cut the last items off the pill
        once Ask and Recovery were added.
      */}
      <ul className="mx-auto flex max-w-full items-stretch justify-between gap-0.5 overflow-x-auto px-0.5 sm:w-auto sm:justify-center sm:gap-1 sm:overflow-visible sm:px-2">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1 sm:flex-none">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  // Eight destinations have to fit a 375px phone, so the mobile
                  // label runs tight, unpadded and a size down; from `sm` up
                  // there is room for the roomier pill treatment.
                  'group flex h-full min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0 py-2',
                  'text-[0.625rem] font-medium leading-tight tracking-tight transition-colors duration-250 ease-calm',
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
                      'flex h-7 w-8 items-center justify-center rounded-pill transition-colors duration-250 ease-calm',
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
