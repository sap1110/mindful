import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressTrail } from '../components/ui/ProgressTrail'
import { buttonStyles } from '../components/ui/buttonStyles'
import { useProfile } from '../hooks/useProfile'
import { stepVariants } from '../lib/motion'
import { createProfile, type CopingStyleId, type ReasonId } from '../lib/profile'
import { StepComplete } from './onboarding/StepComplete'
import { StepName } from './onboarding/StepName'
import { StepReasons } from './onboarding/StepReasons'
import { StepStyle } from './onboarding/StepStyle'

const STEPS = [
  {
    id: 'name',
    trail: 'Your name',
    eyebrow: 'A little about you',
    heading: 'What should we call you?',
    sub: 'Just so Mindful can greet you properly. This never leaves your device.',
  },
  {
    id: 'reasons',
    trail: 'What brings you here',
    eyebrow: 'What brings you here',
    heading: 'What has been on your mind?',
    sub: 'Choose as many as fit, or none at all. This is not a questionnaire and there is no score.',
  },
  {
    id: 'style',
    trail: 'What helps you',
    eyebrow: 'Your coping style',
    heading: 'When things get heavy, what helps?',
    sub: 'Pick the one you would reach for first. You can try the others any time.',
  },
] as const

const TRAIL_LABELS = STEPS.map((step) => step.trail)
const COMPLETE_INDEX = STEPS.length

/**
 * The three-step onboarding flow, plus its completion state.
 *
 * Everything is held in local component state until the final step, so nothing
 * is written to the device until the person has actually finished. Steps
 * cross-fade with a directional hint, and focus moves to the new step heading
 * on every transition so keyboard and screen-reader users are never stranded
 * at the top of the document.
 */
export function Onboarding() {
  const navigate = useNavigate()
  const { profile, isLoading, saveProfile } = useProfile()

  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [name, setName] = useState('')
  const [reasons, setReasons] = useState<ReasonId[]>([])
  const [copingStyleId, setCopingStyleId] = useState<CopingStyleId | null>(null)
  const [nameError, setNameError] = useState<string>()
  const [styleError, setStyleError] = useState<string>()

  // Whether a profile already existed when this screen first mounted. Captured
  // once so that completing the flow (which creates a profile) does not bounce
  // the person away from their own completion screen.
  const hadProfileOnMount = useRef<boolean | null>(null)
  if (!isLoading && hadProfileOnMount.current === null) {
    hadProfileOnMount.current = profile !== null
  }

  // Focus the heading of whichever step just arrived. A callback ref rather
  // than an effect, because AnimatePresence mounts the incoming step only
  // after the outgoing one has finished leaving.
  const focusOnMount = useRef(false)
  const headingRef = useCallback((node: HTMLHeadingElement | null) => {
    if (node && focusOnMount.current) {
      focusOnMount.current = false
      node.focus()
    }
  }, [])

  const goTo = useCallback((next: number, towards: number) => {
    focusOnMount.current = true
    setDirection(towards)
    setStepIndex(next)
  }, [])

  function toggleReason(id: ReasonId) {
    setReasons((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  function handleBack() {
    if (stepIndex === 0) {
      navigate('/')
      return
    }
    goTo(stepIndex - 1, -1)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (stepIndex === 0) {
      if (name.trim().length === 0) {
        setNameError('Please enter something we can call you.')
        return
      }
      setNameError(undefined)
      goTo(1, 1)
      return
    }

    if (stepIndex === 1) {
      goTo(2, 1)
      return
    }

    if (!copingStyleId) {
      setStyleError('Choose the one that feels closest — you can change it later.')
      return
    }

    setStyleError(undefined)
    saveProfile(
      createProfile({
        name,
        reasons,
        copingStyle: copingStyleId,
        completedAt: new Date().toISOString(),
      }),
    )
    goTo(COMPLETE_INDEX, 1)
  }

  if (isLoading) return null

  // Already onboarded on this device? The gate sends you straight to your space.
  if (hadProfileOnMount.current && stepIndex !== COMPLETE_INDEX) {
    return <Navigate to="/home" replace />
  }

  const isComplete = stepIndex === COMPLETE_INDEX
  const step = isComplete ? null : STEPS[stepIndex]
  const continueLabel =
    stepIndex === 1 && reasons.length === 0
      ? 'Skip for now'
      : stepIndex === STEPS.length - 1
        ? 'Finish'
        : 'Continue'

  return (
    <PageShell
      disclaimer={isComplete ? 'panel' : 'note'}
      headerActions={
        isComplete ? null : (
          <Link to="/" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
            Not now
          </Link>
        )
      }
    >
      {isComplete && profile ? (
        <StepComplete profile={profile} />
      ) : (
        <>
          <div className="mb-7 flex items-center justify-between gap-6">
            <ProgressTrail steps={TRAIL_LABELS} current={stepIndex} />
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
          </div>

          <Card tone="raised" padding="lg" className="overflow-hidden">
            <form onSubmit={handleSubmit} noValidate>
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={step?.id}
                  custom={direction}
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    {step?.eyebrow}
                  </p>

                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="mt-3 text-display-xs text-text focus:outline-none sm:text-[2rem] sm:leading-[2.4rem]"
                  >
                    {step?.heading}
                  </h1>

                  <p className="mt-3 max-w-prose text-base text-text-muted">{step?.sub}</p>

                  <div className="mt-8">
                    {stepIndex === 0 ? (
                      <StepName
                        value={name}
                        onChange={(value) => {
                          setName(value)
                          if (nameError) setNameError(undefined)
                        }}
                        error={nameError}
                      />
                    ) : null}

                    {stepIndex === 1 ? (
                      <StepReasons value={reasons} onToggle={toggleReason} />
                    ) : null}

                    {stepIndex === 2 ? (
                      <StepStyle
                        value={copingStyleId}
                        onChange={(id) => {
                          setCopingStyleId(id)
                          if (styleError) setStyleError(undefined)
                        }}
                        error={styleError}
                      />
                    ) : null}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  iconLeft={<ArrowLeft className="h-4 w-4" />}
                >
                  {stepIndex === 0 ? 'Back to start' : 'Back'}
                </Button>

                <Button
                  type="submit"
                  size="lg"
                  iconRight={<ArrowRight className="h-4 w-4" />}
                  className="sm:min-w-[11rem]"
                >
                  {continueLabel}
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}
    </PageShell>
  )
}

export default Onboarding
