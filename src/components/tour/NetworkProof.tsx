import { Check, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'

interface Counts {
  sameOrigin: number
  offOrigin: string[]
}

function readCounts(): Counts {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return { sameOrigin: 0, offOrigin: [] }
  }

  const here = window.location.origin
  const offOrigin = new Set<string>()
  let sameOrigin = 0

  for (const entry of performance.getEntriesByType('resource')) {
    try {
      const origin = new URL(entry.name, here).origin
      if (origin === here) sameOrigin += 1
      // A blob: or data: URL has no meaningful origin and never touches a
      // network — the export download is built from one.
      else if (origin !== 'null') offOrigin.add(origin)
    } catch {
      /* Unparseable entry names are not evidence of anything. */
    }
  }

  return { sameOrigin, offOrigin: [...offOrigin].sort() }
}

/**
 * The privacy claim, checked in front of you.
 *
 * The browser keeps its own record of every resource this page has fetched,
 * and it is not a record the page can forge. Reading it back and sorting by
 * origin turns "nothing leaves your device" from copy on a landing page into
 * something a sceptical person can watch being true — and, more usefully, into
 * something that would visibly stop being true the day someone adds a font CDN
 * or an analytics tag.
 *
 * There is a test that asserts the same thing across a full session of real
 * use (`tests/privacy.spec.ts`). This is that test, made visible to the person
 * the promise was made to.
 *
 * It counts requests, not their contents, and it can only see this page — so
 * it is stated as what it is rather than as proof of more than it shows.
 */
export function NetworkProof() {
  const [counts, setCounts] = useState<Counts>(() => readCounts())

  useEffect(() => {
    // Keep watching: anything loaded after this mounts should show up too,
    // otherwise the count is a snapshot dressed up as a guarantee.
    if (typeof PerformanceObserver === 'undefined') return

    const observer = new PerformanceObserver(() => setCounts(readCounts()))
    try {
      observer.observe({ type: 'resource', buffered: true })
    } catch {
      return
    }
    return () => observer.disconnect()
  }, [])

  const clean = counts.offOrigin.length === 0

  return (
    <Card tone="sunken" padding="md">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
        Requests this page has made
      </p>

      {/*
        A `dl` may only contain `dt`, `dd`, and `div` wrappers around them —
        the supporting line under each figure lives inside its `dd` rather
        than as a sibling paragraph, which is both the valid structure and the
        one that reads correctly when the list is announced.
      */}
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4 shadow-soft">
          <dt className="text-sm text-text-muted">To this app, from this device</dt>
          <dd className="mt-1">
            <span className="font-display text-3xl text-text">{counts.sameOrigin}</span>
            <span className="mt-1 block text-xs text-text-subtle">
              The page itself, its code, and its self-hosted fonts.
            </span>
          </dd>
        </div>

        <div className="rounded-2xl bg-surface p-4 shadow-soft">
          <dt className="text-sm text-text-muted">To any other server</dt>
          <dd className="mt-1">
            <span className="flex items-baseline gap-2 font-display text-3xl text-text">
              {counts.offOrigin.length}
              {clean ? (
                <span className="inline-flex items-center gap-1 font-sans text-sm font-medium text-primary">
                  <Check aria-hidden="true" className="h-4 w-4" />
                  none
                </span>
              ) : null}
            </span>
            <span className="mt-1 block text-xs text-text-subtle">
              {clean ? 'Nothing has been sent anywhere else.' : counts.offOrigin.join(', ')}
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-4 flex items-start gap-2 text-sm text-text-muted">
        <Globe aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
        <span className="max-w-prose">
          Counted from the browser’s own record of what it fetched, which this page cannot rewrite.
          It covers this page — the same check runs across a full session of real use in the test
          suite, and the build fails if any request goes anywhere else.
        </span>
      </p>
    </Card>
  )
}

export default NetworkProof
