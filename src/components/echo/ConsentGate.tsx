import { Download, Loader2, ShieldCheck, WifiOff } from 'lucide-react'
import { MODEL_DOWNLOAD_MB, type EngineStatus } from '../../lib/echo/embeddings'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export interface ConsentGateProps {
  status: EngineStatus
  onEnable: () => void
}

/**
 * The one-time download, asked for plainly.
 *
 * This screen exists because Mindful's headline promise is that nothing leaves
 * the device, and downloading a model is the one moment where the network is
 * touched at all. Glossing over that would be the kind of small dishonesty that
 * makes the larger promise worthless, so the distinction is stated in the copy
 * rather than buried: weights come *down*, nothing goes *up*.
 *
 * It is also a real choice. Nothing downloads on page load, the rest of the app
 * is unaffected by declining, and the button is the only thing that starts it.
 */
export function ConsentGate({ status, onEnable }: ConsentGateProps) {
  if (status.state === 'unavailable') {
    return (
      <Card tone="sunken" padding="lg">
        <h2 className="flex items-center gap-2.5 font-display text-2xl text-text">
          <WifiOff aria-hidden="true" className="h-5 w-5 text-text-subtle" />
          Matching by meaning will not run on this browser
        </h2>
        <p className="mt-3 max-w-prose text-text-muted">
          Echo still works — it is searching your entries by the words in them, which is what it has
          been doing above. What this browser cannot run is the small language model that would let
          it match meaning as well, so an entry about lying awake will only surface if it actually
          used a word you typed.
        </p>
        <p className="mt-3 max-w-prose text-sm text-text-subtle">
          A recent version of Chrome, Edge, Firefox or Safari should be able to run it.
        </p>
      </Card>
    )
  }

  if (status.state === 'loading') {
    const percent = Math.round(status.progress * 100)
    return (
      <Card tone="raised" padding="lg">
        <h2 className="flex items-center gap-2.5 font-display text-2xl text-text">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" />
          Downloading, once
        </h2>

        <p
          className="mt-3 max-w-prose text-text-muted"
          role="status"
          aria-live="polite"
        >
          {percent}% of around {MODEL_DOWNLOAD_MB}MB. Your browser will keep it, so this only
          happens the first time.
        </p>

        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Model download"
          className="mt-5 h-2 w-full overflow-hidden rounded-pill bg-surface-sunken"
        >
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-500 ease-calm"
            style={{ width: `${Math.max(2, percent)}%` }}
          />
        </div>
      </Card>
    )
  }

  return (
    <Card tone="raised" padding="lg">
      <h2 className="font-display text-2xl text-text">Make Echo match meaning, not just words</h2>

      <p className="mt-3 max-w-prose text-text-muted">
        Right now Echo searches your entries for the words you typed. A small language model lets it
        match what you <em>meant</em> instead, so &ldquo;I cannot switch my brain off&rdquo; can
        reach an entry about lying awake that never used those words. Your browser downloads it once
        and keeps it; after that it works with no connection at all.
      </p>

      <p className="mt-3 max-w-prose text-sm text-text-subtle">
        It is around {MODEL_DOWNLOAD_MB}MB in total — the model itself plus the runtime that
        executes it. Worth knowing before you start it on mobile data.
      </p>

      <ul className="mt-5 space-y-3">
        <li className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-primary"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <p className="max-w-prose text-sm text-text-muted">
            <span className="font-medium text-text">The model comes down.</span> That is the only
            network request this feature ever makes, and it is for the model itself.
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-primary"
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <p className="max-w-prose text-sm text-text-muted">
            <span className="font-medium text-text">Nothing goes up.</span> Your journal, your
            check-ins and whatever you type here are read on this device and never sent anywhere.
            There is no server to send them to.
          </p>
        </li>
      </ul>

      <Button className="mt-7" size="lg" iconLeft={<Download className="h-4 w-4" />} onClick={onEnable}>
        Download it and look back
      </Button>

      <p className="mt-4 max-w-prose text-sm text-text-subtle">
        Not now is a perfectly good answer — nothing else in Mindful depends on this.
      </p>
    </Card>
  )
}

export default ConsentGate
