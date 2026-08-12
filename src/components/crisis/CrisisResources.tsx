import { ExternalLink, LifeBuoy, MessageSquare, Phone } from 'lucide-react'
import { CRISIS_RESOURCES, EMERGENCY_NOTE, type CrisisResource } from '../../lib/crisis'
import { cn } from '../../lib/cn'

const ICONS = {
  directory: ExternalLink,
  text: MessageSquare,
  call: Phone,
} as const

export interface CrisisResourcesProps {
  /**
   * `urgent` is for the moment a risk item has just been answered — it takes
   * the accent treatment and leads with the emergency line. `quiet` is the
   * always-present version that sits at the foot of the self-check screen so
   * the list is never something you have to score badly to be shown.
   */
  tone?: 'urgent' | 'quiet'
  /** Overrides the default heading when the surrounding context needs its own. */
  heading?: string
  className?: string
}

/**
 * Where to turn, right now.
 *
 * Real links, not a phone number rendered as plain text: `tel:` and `sms:`
 * hrefs mean one tap dials on the device most people are holding. Every row
 * states its region before its number, because a US-only line presented without
 * that label to someone in Jakarta is worse than showing nothing.
 *
 * The heading is a real heading inside a labelled `<section>`, so this block is
 * reachable directly from a screen reader's landmark and heading lists rather
 * than only by reading down the page.
 */
export function CrisisResources({
  tone = 'quiet',
  heading = 'If you need to talk to someone now',
  className,
}: CrisisResourcesProps) {
  const isUrgent = tone === 'urgent'

  return (
    <section
      aria-labelledby="crisis-resources-heading"
      className={cn(
        'rounded-3xl border p-6 sm:p-7',
        isUrgent
          ? 'border-accent/45 bg-accent-soft/60 shadow-lift'
          : 'border-border bg-surface-muted/60 shadow-soft',
        className,
      )}
    >
      <h2
        id="crisis-resources-heading"
        className="flex items-center gap-2.5 font-sans text-base font-semibold text-text"
      >
        <LifeBuoy
          aria-hidden="true"
          className={cn('h-5 w-5 shrink-0', isUrgent ? 'text-accent-hover' : 'text-accent')}
        />
        {heading}
      </h2>

      <p
        className={cn(
          'mt-2.5 max-w-prose text-sm',
          isUrgent ? 'font-medium text-text' : 'text-text-muted',
        )}
      >
        {EMERGENCY_NOTE}
      </p>

      <ul className="mt-5 space-y-2.5">
        {CRISIS_RESOURCES.map((resource) => (
          <CrisisRow key={resource.id} resource={resource} />
        ))}
      </ul>

      <p className="mt-5 max-w-prose text-xs text-text-subtle">
        These services are independent of Mindful. Details change — if a number here does not
        connect, the international directories at the top of the list are kept up to date.
      </p>
    </section>
  )
}

function CrisisRow({ resource }: { resource: CrisisResource }) {
  const Icon = ICONS[resource.kind]
  const opensTab = resource.kind === 'directory'

  return (
    <li>
      <a
        href={resource.href}
        {...(opensTab ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        className={cn(
          'flex items-start gap-3.5 rounded-2xl border border-border bg-surface p-4 shadow-soft',
          'transition-[border-color,box-shadow] duration-250 ease-calm',
          'hover:border-border-strong hover:shadow-lift',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-primary"
        >
          <Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>

        <span className="min-w-0">
          <span className="block font-medium text-text">
            {resource.name}
            <span className="ml-2 rounded-pill bg-surface-muted px-2 py-0.5 text-2xs font-medium tracking-normal text-text-muted">
              {resource.region}
            </span>
          </span>
          <span className="mt-0.5 block text-sm font-medium text-primary-hover">
            {resource.action}
            {opensTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
          </span>
          <span className="mt-1 block max-w-prose text-sm text-text-muted">{resource.note}</span>
        </span>
      </a>
    </li>
  )
}

export default CrisisResources
