import { motion } from 'framer-motion'
import { ArrowRight, Leaf, Lock, NotebookPen, Waves } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BreathingHalo } from '../components/BreathingHalo'
import { BreakIt } from '../components/inside/BreakIt'
import { MeasuredNumbers } from '../components/inside/MeasuredNumbers'
import { PipelineTheatre } from '../components/inside/PipelineTheatre'
import { MoodPreview } from '../components/landing/MoodPreview'
import { OneBreath } from '../components/landing/OneBreath'
import { PageShell } from '../components/PageShell'
import { buttonStyles } from '../components/ui/buttonStyles'
import { cn } from '../lib/cn'
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
        <motion.div variants={fadeUp} className="space-y-5">
          <BreathingHalo className="mx-auto max-w-[18rem] lg:max-w-none" />
          <OneBreath />
        </motion.div>
      </motion.div>

      {/*
        The product, playable, before the pitch has finished. Someone who came
        here unsure is better served by twelve seconds of the actual thing than
        by another paragraph about it.
      */}
      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="mt-16 grid gap-4 sm:mt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-5"
      >
        <motion.div variants={staggerChild}>
          <MoodPreview />
        </motion.div>

        <motion.div
          variants={staggerChild}
          className="relative overflow-hidden rounded-3xl border border-border bg-surface/85 p-5 shadow-soft backdrop-blur sm:p-6"
        >
          <div
            aria-hidden="true"
            className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-lavender-200/45 blur-2xl"
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
              And when you look back
            </p>
            <p className="mt-2 font-display text-xl text-text">
              “You have written something like this before.”
            </p>
            <p className="mt-3 text-sm text-text-muted">
              Mindful searches your own entries for the times that read like today — and shows you
              what the fortnight after each of them actually looked like. Not advice. Your record.
            </p>
            <p className="mt-4 text-sm text-text-subtle">
              It runs on your device, so your journal never has to leave it.
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* ------------------------------------------------------ the showcase */}
      {/*
        The centre of gravity of this page, and deliberately placed after the
        product rather than before it: the argument only lands once someone
        knows what the thing is.

        Everything in this section is live. The pipeline runs, the verifier
        rejects, the browser refuses the request, the evaluation suite executes.
        A page that made these claims in prose would be indistinguishable from
        every other health app that makes them, which is exactly the problem it
        exists to solve.
      */}
      <motion.section
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        aria-labelledby="showcase-heading"
        className="mt-24 sm:mt-28"
      >
        <motion.p
          variants={staggerChild}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
        >
          Under the hood
        </motion.p>

        <motion.h2
          variants={staggerChild}
          id="showcase-heading"
          className="mt-3 max-w-prose text-display-xs text-text sm:text-display-sm"
        >
          An AI that cannot invent, on a device that cannot leak.
        </motion.h2>

        <motion.p variants={staggerChild} className="mt-4 max-w-prose text-lg text-text-muted">
          Both are ordinary things to claim. Neither is checkable from a marketing page — so
          everything below is running for real, in this tab, on your machine. Break it if you can.
        </motion.p>

        <motion.div variants={staggerChild} className="mt-8">
          <PipelineTheatre />
        </motion.div>

        <motion.div variants={staggerChild} className="mt-5">
          <BreakIt />
        </motion.div>

        <motion.div variants={staggerChild} className="mt-5">
          <MeasuredNumbers />
        </motion.div>

        <motion.p variants={staggerChild} className="mt-6 max-w-prose text-sm text-text-subtle">
          The answer is assembled from documents published by the NHS, the CDC, the WHO,
          MedlinePlus and the NIH — every sentence lifted verbatim and carrying the link it came
          from. There is no language model writing prose about anyone&rsquo;s health, which is why
          the invented-claim rate is a structural zero rather than a low number someone is
          monitoring.
        </motion.p>
      </motion.section>

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
            className={cn(
              'group rounded-3xl border border-border bg-surface/85 p-6 shadow-soft backdrop-blur',
              'transition-[box-shadow,border-color,transform] duration-400 ease-calm',
              'hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lift',
              'motion-reduce:hover:translate-y-0',
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary',
                'transition-transform duration-400 ease-settle group-hover:scale-105',
                'motion-reduce:group-hover:scale-100',
              )}
            >
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
