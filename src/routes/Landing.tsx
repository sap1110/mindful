import { motion } from 'framer-motion'
import { ArrowRight, Leaf, Lock, NotebookPen, Waves } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BreathingHalo } from '../components/BreathingHalo'
import { PageShell } from '../components/PageShell'
import { buttonStyles } from '../components/ui/buttonStyles'
import { fadeUp, staggerChild, staggerParent } from '../lib/motion'
import { useProfile } from '../hooks/useProfile'

const PILLARS = [
  {
    icon: Waves,
    title: 'Settle first',
    body: 'A guided breath before anything asks anything of you.',
  },
  {
    icon: NotebookPen,
    title: 'Name it',
    body: 'Short, kind prompts for what is actually going on today.',
  },
  {
    icon: Leaf,
    title: 'One small step',
    body: 'A single next action, sized for the energy you have.',
  },
] as const

/**
 * The landing screen — Mindful's first impression, and the screen the whole
 * design language is set by. Calm hierarchy, one accent, generous space, and a
 * live breathing element that demonstrates the product before you sign up.
 */
export function Landing() {
  const { profile } = useProfile()

  return (
    <PageShell
      backdrop="hero"
      width="wide"
      disclaimer="panel"
      headerActions={
        profile ? (
          <Link to="/home" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            Continue as {profile.name}
          </Link>
        ) : null
      }
    >
      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16"
      >
        <div>
          <motion.p
            variants={staggerChild}
            className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface/80 px-3.5 py-1.5 text-xs font-medium text-text-muted shadow-soft backdrop-blur"
          >
            <Lock aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
            Private by design — everything stays on your device
          </motion.p>

          <motion.h1
            variants={staggerChild}
            className="mt-7 text-display-sm text-text sm:text-display-md lg:text-display-lg"
          >
            A quieter place to check in with&nbsp;yourself.
          </motion.h1>

          <motion.p
            variants={staggerChild}
            className="mt-6 max-w-measure text-lg text-text-muted sm:text-xl"
          >
            Mindful is a small, unhurried companion for the ordinary hard days. Take a breath, say
            what is going on, and leave with one thing you can actually do.
          </motion.p>

          <motion.div variants={staggerChild} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/onboarding"
              className={buttonStyles({ size: 'lg' })}
            >
              Get started
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>

            <Link
              to={profile ? '/home' : '/onboarding'}
              className={buttonStyles({ variant: 'secondary', size: 'lg' })}
            >
              {profile ? 'Back to your space' : 'I have been here before'}
            </Link>
          </motion.div>

          <motion.p variants={staggerChild} className="mt-5 text-sm text-text-subtle">
            Takes about a minute. No account, no email, nothing to cancel.
          </motion.p>
        </div>

        {/* Below the pitch on small screens — the words should lead on a phone. */}
        <motion.div variants={fadeUp}>
          <BreathingHalo className="mx-auto max-w-[20rem] lg:max-w-none" />
        </motion.div>
      </motion.div>

      {/* Three pillars — the shape of what Mindful does, in one glance. */}
      <motion.ul
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="mt-20 grid gap-4 sm:grid-cols-3 sm:gap-5"
      >
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <motion.li
            key={title}
            variants={staggerChild}
            className="rounded-3xl border border-border bg-surface/85 p-6 shadow-soft backdrop-blur transition-shadow duration-400 ease-calm hover:shadow-lift"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-xl text-text">{title}</h2>
            <p className="mt-1.5 text-sm text-text-muted">{body}</p>
          </motion.li>
        ))}
      </motion.ul>
    </PageShell>
  )
}

export default Landing
