import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { buttonStyles } from '../components/ui/buttonStyles'

/** A calm 404 — no sirens, no "oops". */
export function NotFound() {
  return (
    <PageShell>
      <div className="py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
          Page not found
        </p>
        <h1 className="mt-3 text-display-xs text-text sm:text-display-sm">
          There is nothing here — which is its own kind of quiet.
        </h1>
        <p className="mx-auto mt-4 max-w-measure text-lg text-text-muted">
          The page you were after does not exist. Let&rsquo;s get you back somewhere useful.
        </p>
        <Link to="/" className={buttonStyles({ size: 'lg', className: 'mt-8' })}>
          Back to the start
        </Link>
      </div>
    </PageShell>
  )
}

export default NotFound
