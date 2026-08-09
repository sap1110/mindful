import { motion } from 'framer-motion'
import { BookOpen, HandHeart, NotebookPen, Smile, Sparkles, Waves } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useProfile } from '../hooks/useProfile'
import { staggerChild, staggerParent } from '../lib/motion'
import { copingStyle, greetingFor, reasonLabel } from '../lib/profile'

/** Phase 2 surfaces, shown here so the shape of the product is legible today. */
const UPCOMING = [
  { icon: Smile, title: 'Daily check-in', body: 'One tap to log how today actually feels.' },
  { icon: NotebookPen, title: 'Guided journal', body: 'Short prompts shaped by what you told us.' },
  { icon: Waves, title: 'Calm library', body: 'Breathing, grounding and stretch sessions.' },
  { icon: BookOpen, title: 'Resources', body: 'Vetted, local support — always one tap away.' },
] as const

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
  const timeOfDay = greetingFor(new Date())

  function handleStartOver() {
    resetProfile()
    navigate('/', { replace: true })
  }

  return (
    <PageShell
      disclaimer="panel"
      headerActions={
        <Button variant="ghost" size="sm" onClick={handleStartOver}>
          Start over
        </Button>
      }
    >
      <motion.div variants={staggerParent} initial="hidden" animate="visible">
        <motion.p
          variants={staggerChild}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
        >
          Good {timeOfDay}
        </motion.p>

        <motion.h1
          variants={staggerChild}
          className="mt-3 text-display-xs text-text sm:text-display-sm"
        >
          Hello, {profile.name}.
        </motion.h1>

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
                <Button size="lg" disabled iconLeft={<HandHeart className="h-4 w-4" />}>
                  Coming in the next release
                </Button>
                <p className="text-sm text-text-subtle">
                  Phase 1 sets the tone; the sessions land next.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* What they told us, reflected back. */}
        {profile.reasons.length > 0 ? (
          <motion.section variants={staggerChild} className="mt-10" aria-labelledby="focus-heading">
            <h2 id="focus-heading" className="text-sm font-semibold uppercase tracking-[0.12em] text-text-subtle">
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

        <motion.section variants={staggerChild} className="mt-12" aria-labelledby="upcoming-heading">
          <h2
            id="upcoming-heading"
            className="text-sm font-semibold uppercase tracking-[0.12em] text-text-subtle"
          >
            Coming next
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {UPCOMING.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex items-start gap-3.5 rounded-2xl border border-border bg-surface/70 p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-primary">
                  <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-[0.9375rem] font-medium text-text">{title}</span>
                  <span className="mt-0.5 block text-sm text-text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      </motion.div>
    </PageShell>
  )
}

export default Home
