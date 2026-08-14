import { motion } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  ClipboardCheck,
  History,
  MessageCircleQuestion,
  NotebookPen,
  Settings as SettingsIcon,
  Smile,
  Sparkles,
  Wind,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AppNav } from '../components/AppNav'
import { TimeMotif } from '../components/home/TimeMotif'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/ui/Button'
import { buttonStyles } from '../components/ui/buttonStyles'
import { Card } from '../components/ui/Card'
import { useProfile } from '../hooks/useProfile'
import { cn } from '../lib/cn'
import { timeOfDay } from '../lib/date'
import { staggerChild, staggerParent } from '../lib/motion'
import { copingStyle, greetingFor, reasonLabel, type CopingStyleId } from '../lib/profile'

/** The screens Mindful can take you to, in the order most people want them. */
const SURFACES = [
  { to: '/mood', icon: Smile, title: 'Daily check-in', body: 'One tap to log how today feels.' },
  {
    to: '/self-check',
    icon: ClipboardCheck,
    title: 'Self-check',
    body: 'The PHQ-9 and GAD-7, scored on this device.',
  },
  {
    to: '/echo',
    icon: History,
    title: 'Echo',
    body: 'Find the times you have written something like this before.',
  },
  {
    to: '/ask',
    icon: MessageCircleQuestion,
    title: 'Ask',
    body: 'Evidence-first answers, every claim traced to a named source.',
  },
  {
    to: '/journal',
    icon: NotebookPen,
    title: 'Journal',
    body: 'A prompt if you want one, a blank page if you do not.',
  },
  {
    to: '/recovery',
    icon: Brain,
    title: 'Recovery',
    body: 'Concussion symptom tracking and a graduated return plan.',
  },
  { to: '/breathe', icon: Wind, title: 'Breathe', body: 'Triangle, 4-7-8 or a slower, even rhythm.' },
  {
    to: '/settings',
    icon: SettingsIcon,
    title: 'Your data',
    body: 'Export it, erase it, or fill the app with samples.',
  },
] as const

/** Where the chosen coping style should send someone first. */
const FIRST_STEP_ROUTE: Record<CopingStyleId, string> = {
  breathing: '/breathe',
  journaling: '/journal',
  movement: '/breathe',
  grounding: '/breathe',
  connection: '/journal',
}

/**
 * The post-onboarding home. A placeholder for Phase 1, but a real one: it uses
 * the stored profile so the design of the personalised experience is already
 * visible, and it owns the "forget me" control.
 */
export function Home() {
  const { profile, resetProfile } = useProfile()
  const navigate = useNavigate()

  // RequireProfile guarantees a profile before this renders.
  if (!profile) return null

  const style = copingStyle(profile.copingStyle)
  const greeting = greetingFor(new Date())

  function handleStartOver() {
    resetProfile()
    navigate('/', { replace: true })
  }

  return (
    <PageShell
      disclaimer="panel"
      nav={<AppNav />}
      headerActions={
        <Button variant="ghost" size="sm" onClick={handleStartOver}>
          Start over
        </Button>
      }
    >
      <motion.div variants={staggerParent} initial="hidden" animate="visible">
        <div className="flex items-start justify-between gap-6">
          <div>
            <motion.p
              variants={staggerChild}
              className="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
            >
              {greeting}
            </motion.p>

            <motion.h1
              variants={staggerChild}
              className="mt-3 text-display-xs text-text sm:text-display-sm"
            >
              Hello, {profile.name}.
            </motion.h1>
          </div>

          {/* Decorative only — the greeting beside it already says the hour. */}
          <motion.div variants={staggerChild} className="hidden shrink-0 sm:block">
            <TimeMotif when={timeOfDay()} />
          </motion.div>
        </div>

        <motion.p variants={staggerChild} className="mt-4 max-w-prose text-lg text-text-muted">
          Nothing is due and nothing is tracked. Whenever you have a minute, start with the thing
          you said helps most.
        </motion.p>

        {/* The one suggested action, drawn from the chosen coping style. */}
        <motion.div variants={staggerChild} className="mt-9">
          <Card tone="raised" padding="lg" className="relative overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-soft/60 blur-2xl"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-pill bg-accent-soft px-3 py-1 text-xs font-medium text-accent-hover">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                Your first step
              </span>

              <h2 className="mt-4 text-2xl text-text sm:text-3xl">
                {style ? style.firstStep.replace(/^a /, 'A ') : 'A moment to pause'}
              </h2>
              <p className="mt-2 max-w-prose text-text-muted">
                {style?.description ?? 'A short pause, whenever you are ready.'}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to={FIRST_STEP_ROUTE[profile.copingStyle]} className={buttonStyles({ size: 'lg' })}>
                  Start now
                </Link>
                <p className="text-sm text-text-subtle">Two minutes is plenty. So is one.</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* What they told us, reflected back. */}
        {profile.reasons.length > 0 ? (
          <motion.section variants={staggerChild} className="mt-10" aria-labelledby="focus-heading">
            <h2
              id="focus-heading"
              className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
            >
              What Mindful will keep in mind
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.reasons.map((reason) => (
                <li
                  key={reason}
                  className="rounded-pill border border-border bg-surface px-3.5 py-1.5 text-sm text-text shadow-soft"
                >
                  {reasonLabel(reason)}
                </li>
              ))}
            </ul>
          </motion.section>
        ) : null}

        <motion.section variants={staggerChild} className="mt-12" aria-labelledby="surfaces-heading">
          <h2
            id="surfaces-heading"
            className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
          >
            Everything in Mindful
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {SURFACES.map(({ to, icon: Icon, title, body }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    'group flex h-full items-start gap-3.5 rounded-2xl border border-border',
                    'bg-surface/70 p-5 shadow-soft',
                    'transition-[background-color,border-color,box-shadow,transform] duration-400 ease-calm',
                    'hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface hover:shadow-lift',
                    'motion-reduce:hover:translate-y-0',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      'bg-surface-muted text-primary transition-colors duration-400 ease-calm',
                      'group-hover:bg-primary-soft',
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[0.9375rem] font-medium text-text">{title}</span>
                      <ArrowRight
                        aria-hidden="true"
                        className={cn(
                          'h-3.5 w-3.5 -translate-x-1 text-primary opacity-0',
                          'transition-[opacity,transform] duration-400 ease-calm',
                          'group-hover:translate-x-0 group-hover:opacity-100',
                          'motion-reduce:transition-none',
                        )}
                      />
                    </span>
                    <span className="mt-0.5 block text-sm text-text-muted">{body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.section>
      </motion.div>
    </PageShell>
  )
}

export default Home
