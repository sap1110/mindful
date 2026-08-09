import { motion } from 'framer-motion'
import { ArrowRight, Check, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from '../../components/ui/buttonStyles'
import { bloom, staggerChild, staggerParent } from '../../lib/motion'
import { copingStyle, reasonLabel, type Profile } from '../../lib/profile'

/**
 * The completion state. Reflects the answers back so the person can see the
 * app actually listened, and names the single first step it will offer.
 */
export function StepComplete({ profile }: { profile: Profile }) {
  const style = copingStyle(profile.copingStyle)

  return (
    <motion.div variants={staggerParent} initial="hidden" animate="visible" className="text-center">
      <motion.div variants={bloom} className="mx-auto w-fit">
        <span className="relative flex h-20 w-20 items-center justify-center rounded-pill bg-success-soft">
          <span className="absolute inset-0 animate-breathe rounded-pill bg-success/15" />
          <Check aria-hidden="true" className="relative h-9 w-9 stroke-[2.25] text-success" />
        </span>
      </motion.div>

      <motion.h1
        variants={staggerChild}
        className="mt-8 text-display-xs text-text sm:text-display-sm"
      >
        You&rsquo;re all set, {profile.name}.
      </motion.h1>

      <motion.p
        variants={staggerChild}
        className="mx-auto mt-4 max-w-measure text-lg text-text-muted"
      >
        Mindful is yours now. Come back whenever you like — there is no streak to keep and nothing
        to fall behind on.
      </motion.p>

      {/* What we heard */}
      <motion.div
        variants={staggerChild}
        className="mx-auto mt-9 max-w-measure rounded-3xl border border-border bg-surface p-6 text-left shadow-soft"
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-subtle">
          What you told Mindful
        </h2>

        <dl className="mt-4 space-y-4">
          <div>
            <dt className="text-sm text-text-muted">On your mind</dt>
            <dd className="mt-2">
              {profile.reasons.length === 0 ? (
                <p className="text-[0.9375rem] text-text">
                  Nothing in particular — you can add this any time.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {profile.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="rounded-pill border border-border bg-surface-muted px-3 py-1 text-sm text-text"
                    >
                      {reasonLabel(reason)}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-text-muted">What helps you</dt>
            <dd className="mt-1.5 text-[0.9375rem] text-text">
              {style?.label}
              {style ? <span className="text-text-muted"> — {style.description}</span> : null}
            </dd>
          </div>
        </dl>

        <div className="mt-5 rounded-2xl bg-primary-soft/70 p-4">
          <p className="text-[0.9375rem] text-primary-hover">
            <span className="font-medium">First up:</span> {style?.firstStep ?? 'a moment to pause'}
            .
          </p>
        </div>
      </motion.div>

      <motion.div variants={staggerChild} className="mt-9">
        <Link to="/home" className={buttonStyles({ size: 'lg' })} replace>
          Go to your space
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </motion.div>

      <motion.p
        variants={staggerChild}
        className="mx-auto mt-5 flex max-w-measure items-center justify-center gap-2 text-sm text-text-subtle"
      >
        <Lock aria-hidden="true" className="h-3.5 w-3.5" />
        Saved to this device only. You can change or delete it whenever you want.
      </motion.p>
    </motion.div>
  )
}

export default StepComplete
