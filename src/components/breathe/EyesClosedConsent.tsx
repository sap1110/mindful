import { Eye } from 'lucide-react'
import { EYES_CLOSED_CHECKS } from '../../lib/breathingSafety'
import { Button } from '../ui/Button'
import { Overlay } from '../ui/Overlay'

export interface EyesClosedConsentProps {
  onConfirm: () => void
  onCancel: () => void
}

/**
 * The one-time check before the first eyes-closed session.
 *
 * Closing your eyes for three minutes is only safe if you are somewhere safe to
 * do it, and that is not something an app can work out — no sensor tells us
 * whether someone is on a train platform or at a desk. So it is asked, once,
 * plainly, before the mode is ever used, and remembered after that. Asking
 * every session would train people to dismiss it unread, which is worse than
 * not asking at all.
 *
 * The exits are deliberately symmetrical. "Not now" is a real answer, not a
 * greyed-out afterthought, because the honest response to "are you somewhere
 * safe" is sometimes no.
 */
export function EyesClosedConsent({ onConfirm, onCancel }: EyesClosedConsentProps) {
  return (
    <Overlay
      labelledBy="eyes-closed-consent-heading"
      onDismiss={onCancel}
      className="flex items-center justify-center bg-ink/45 p-5"
    >
      <div className="w-full max-w-measure rounded-3xl border border-border bg-surface p-6 shadow-float sm:p-8">
        <h2
          id="eyes-closed-consent-heading"
          className="flex items-center gap-2.5 font-display text-2xl text-text"
        >
          <Eye aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
          Before you close your eyes
        </h2>

        <p className="mt-3 text-base text-text-muted">
          The screen dims and the voice leads from here, so please check all three:
        </p>

        <ul className="mt-4 space-y-2.5 text-base text-text-muted">
          {EYES_CLOSED_CHECKS.map((check) => (
            <li key={check} className="flex gap-2.5">
              <span aria-hidden="true" className="select-none text-text-subtle">
                ·
              </span>
              <span>{check}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button data-autofocus size="lg" onClick={onConfirm}>
            I&rsquo;m somewhere safe
          </Button>
          <Button size="lg" variant="secondary" onClick={onCancel}>
            Not now
          </Button>
        </div>

        <p className="mt-4 text-sm text-text-subtle">
          Asked once, then remembered on this device. The dizziness reminder is spoken at the start
          of every session.
        </p>
      </div>
    </Overlay>
  )
}

export default EyesClosedConsent
