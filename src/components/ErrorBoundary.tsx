import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * The last line of defence, written so that failing is not also a disclosure.
 *
 * An app holding journal entries and questionnaire answers has to be careful
 * about *how* it breaks. The default failure modes all leak something: React
 * unmounts to a white screen and prints a component stack to the console, an
 * unguarded fallback renders `error.message` — which can carry whatever string
 * was being processed when it threw — and a "copy this error" affordance
 * invites someone to paste their own data into a bug report.
 *
 * So this fallback shows *nothing* about the error. No message, no stack, no
 * component trace, no error code, no copy button. Three things a person needs
 * and nothing else: that something broke, that their entries are still on the
 * device and were not sent anywhere, and a way out.
 *
 * The error is logged to the console in development only. In a production
 * build the console call is compiled out entirely (see `vite.config.ts`), so
 * there is no path by which a thrown string reaches anywhere it could be read
 * off a shared screen or scraped by an extension.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Development only. `drop: ['console']` removes this from production
    // builds, so nothing about a failure survives into a shipped bundle.
    if (import.meta.env.DEV) {
      console.error('Mindful caught a render error', error, info.componentStack)
    }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children

    return (
      <main className="mx-auto flex min-h-screen max-w-measure flex-col justify-center px-5 py-16">
        <div className="rounded-3xl border border-border bg-surface p-7 shadow-lift sm:p-9">
          <h1 className="font-display text-2xl text-text sm:text-3xl">
            Something in the app stopped working.
          </h1>

          <p className="mt-4 text-text-muted">
            Not something you did, and nothing was lost. Everything you have written is still
            stored on this device exactly as it was — it has not been sent anywhere, because there
            is nowhere for it to go.
          </p>

          <p className="mt-3 text-text-muted">
            Reloading usually clears it. If it keeps happening, your data can be exported from the
            settings screen at any time.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center justify-center rounded-pill bg-primary px-6 text-base font-medium text-primary-fg shadow-soft transition-colors duration-250 ease-calm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Reload the app
            </button>

            <a
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-pill border border-border bg-surface px-6 text-base font-medium text-text shadow-soft transition-colors duration-250 ease-calm hover:border-border-strong hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Start again from the beginning
            </a>
          </div>
        </div>
      </main>
    )
  }
}

export default ErrorBoundary
