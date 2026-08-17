import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppNav } from '../components/AppNav'
import { OneBreath } from '../components/landing/OneBreath'
import { PageShell } from '../components/PageShell'
import { AskDemo } from '../components/tour/AskDemo'
import { ClinicalNotes } from '../components/tour/ClinicalNotes'
import { DataDemo } from '../components/tour/DataDemo'
import { JournalDemo } from '../components/tour/JournalDemo'
import { MoodDemo } from '../components/tour/MoodDemo'
import { NetworkProof } from '../components/tour/NetworkProof'
import { Button } from '../components/ui/Button'
import { buttonStyles } from '../components/ui/buttonStyles'
import { Card } from '../components/ui/Card'
import { ProgressTrail } from '../components/ui/ProgressTrail'
import { useProfile } from '../hooks/useProfile'
import { stepVariants } from '../lib/motion'
import { markTourSeen } from '../lib/storage'
import { TOUR_STEPS, TOUR_TRAIL, tourStepIndex } from '../lib/tour'

/** The working piece of the app that belongs under each step. */
const DEMOS: Record<string, ReactNode> = {
  private: <NetworkProof />,
  'check-in': <MoodDemo />,
  journal: <JournalDemo />,
  breathe: <OneBreath />,
  ask: <AskDemo />,
  clinical: <ClinicalNotes />,
  data: <DataDemo />,
}

/**
 * The guided tour — `/tour`.
 *
 * Deliberately outside the profile gate. Someone deciding whether this app is
 * worth their time should not have to hand it a name first, and the people
 * most likely to want a tour are exactly the ones who have not signed up yet.
 * Every demo on it therefore has to work with no profile and no stored data,
 * which is a useful constraint: it is the same state a real first-time user is
 * in.
 *
 * The current step lives in the URL (`?step=ask`), not in component state, so
 * any single step can be linked to or reloaded into. That is worth the small
 * amount of extra plumbing — a walkthrough you cannot point someone at is
 * missing most of the point of being a walkthrough.
 *
 * Focus moves to the heading of each new step, the same way the onboarding
 * flow does it, so the tour is followable without a mouse and does not strand
 * a screen-reader user at the top of the document on every Next.
 */
export function Tour() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile, isLoading } = useProfile()

  const index = tourStepIndex(params.get('step'))
  const step = TOUR_STEPS[index]
  const isLast = index === TOUR_STEPS.length - 1

  // The offer has been made. Recorded on arrival rather than on completion:
  // someone who opened the tour and closed it after one step has seen it, and
  // being asked again tomorrow would be the app not listening.
  useEffect(() => {
    markTourSeen()
  }, [])

  // Focus the incoming heading, but never the one that is already there on
  // first paint — stealing focus from a page someone has just opened moves
  // them somewhere they did not ask to go.
  const focusOnMount = useRef(false)
  const headingRef = useCallback((node: HTMLHeadingElement | null) => {
    if (node && focusOnMount.current) {
      focusOnMount.current = false
      node.focus()
    }
  }, [])

  const goTo = useCallback(
    (next: number) => {
      focusOnMount.current = true
      setParams({ step: TOUR_STEPS[next].id }, { replace: true })
    },
    [setParams],
  )

  function handleBack() {
    if (index === 0) {
      navigate(profile ? '/home' : '/')
      return
    }
    goTo(index - 1)
  }

  function handleNext() {
    if (!isLast) {
      goTo(index + 1)
      return
    }
    navigate(profile ? '/home' : '/onboarding')
  }

  // Whether there is a profile changes the section bar, the exits and the
  // closing line, so wait rather than render the signed-out tour and swap it
  // out a frame later.
  if (isLoading) return null

  return (
    <PageShell
      disclaimer="panel"
      nav={profile ? <AppNav /> : undefined}
      headerActions={
        <Link
          to={profile ? '/home' : '/'}
          className={buttonStyles({ variant: 'ghost', size: 'sm' })}
        >
          {profile ? 'Back to your space' : 'Skip the tour'}
        </Link>
      }
    >
      <div className="mb-7 flex items-center justify-between gap-6">
        <ProgressTrail steps={TOUR_TRAIL} current={index} />
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">
          {index + 1} of {TOUR_STEPS.length}
        </p>
      </div>

      <Card tone="raised" padding="lg" className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            custom={1}
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {step.eyebrow}
            </p>

            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-3 max-w-prose text-display-xs text-text focus:outline-none sm:text-[2rem] sm:leading-[2.4rem]"
            >
              {step.title}
            </h1>

            <div className="mt-4 space-y-3">
              {step.body.map((paragraph) => (
                <p key={paragraph} className="max-w-prose text-text-muted">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-8">{DEMOS[step.id]}</div>

            {/* The real screen, for anyone who has one to go to. */}
            {step.destination && profile ? (
              <p className="mt-6">
                <Link
                  to={step.destination.to}
                  className="rounded-xs text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                >
                  {step.destination.label} →
                </Link>
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={handleBack} iconLeft={<ArrowLeft className="h-4 w-4" />}>
            {index === 0 ? 'Leave the tour' : 'Back'}
          </Button>

          <Button
            size="lg"
            onClick={handleNext}
            iconRight={isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            className="sm:min-w-[11rem]"
          >
            {isLast ? (profile ? 'Back to your space' : 'Get started') : 'Next'}
          </Button>
        </div>
      </Card>

      {!profile ? (
        <p className="mt-6 text-sm text-text-subtle">
          You can go through all of this without an account, because there is no account to make.
          Setting up takes about a minute and creates a profile in this browser and nowhere else.
        </p>
      ) : null}
    </PageShell>
  )
}

export default Tour
