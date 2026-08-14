/**
 * The graduated return strategies, and the rules that gate them.
 *
 * Two ladders, from the Amsterdam 2023 consensus statement: four steps back to
 * learning or work, six back to sport. Return to learn comes first and the app
 * says so — someone who cannot sit through a lesson has no business at contact
 * training, and the consensus is explicit that school takes precedence.
 *
 * The rules are the feature. Anyone can print a list of stages; what people
 * actually get wrong is the pacing, because the injury itself makes you a poor
 * judge of your own recovery and because there is always a reason this week is
 * the week to skip a step. So the rules are enforced in code rather than
 * printed as advice:
 *
 *   · a minimum of 24 hours at every stage, timed from when it was started
 *   · a step is only passed if symptoms stayed within a mild, brief increase —
 *     no more than 2 points on a 0-10 scale, settling within an hour
 *   · anything worse means going back a stage, which the app does *for* you
 *   · from stage 4 of return to sport, symptoms must be back to baseline
 *   · full-contact practice needs a clinician's clearance, recorded as
 *     something a clinician said and never something this app decided
 *
 * The last one is the line this feature will not cross. It can pace, remind
 * and record. It cannot clear anyone to play, and it is written so that no
 * combination of taps produces a screen that appears to.
 */

export type Track = 'learn' | 'sport'

export interface Stage {
  /** 1-based, matching how the published strategies are numbered. */
  number: number
  name: string
  /** What the stage permits, in plain words. */
  activity: string
  /** What it is for, which is what makes the order make sense. */
  aim: string
  /** True where a clinician has to sign this off before it starts. */
  needsClearance?: boolean
  /** True where symptoms must be back to baseline before starting. */
  needsBaseline?: boolean
}

/** Return to learn or work — four steps, and the one that goes first. */
export const LEARN_STAGES: readonly Stage[] = [
  {
    number: 1,
    name: 'Daily activities at home',
    activity:
      'Ordinary things around the house that do not make symptoms much worse — a short walk, a conversation, reading or a screen for five to fifteen minutes at a time, building up as you tolerate it.',
    aim: 'A gradual return to normal daily life.',
  },
  {
    number: 2,
    name: 'Schoolwork or work tasks at home',
    activity:
      'Reading, homework, admin or work tasks done at home, in blocks with breaks between them. Still not going in.',
    aim: 'Building up how much concentration you can tolerate.',
  },
  {
    number: 3,
    name: 'Part-time, in person',
    activity:
      'Back into school or work part-time — shorter days, a lighter load, and more breaks than you think you need. Catching up on what you missed comes later.',
    aim: 'Increasing academic or work activity in the environment itself.',
  },
  {
    number: 4,
    name: 'Full days',
    activity:
      'Full days without more than mild symptom exacerbation, then gradually catching up on what was missed.',
    aim: 'Back to full activity.',
  },
]

/** Return to sport — six stages. Stages 5 and 6 carry impact risk. */
export const SPORT_STAGES: readonly Stage[] = [
  {
    number: 1,
    name: 'Symptom-limited activity',
    activity:
      'Daily activities that do not provoke symptoms much — walking about, light household things. Not training.',
    aim: 'A gradual return to being upright and moving.',
  },
  {
    number: 2,
    name: 'Light to moderate aerobic exercise',
    activity:
      'Walking or stationary cycling at a light pace, and if that is tolerated, a moderate one. No resistance training, nothing where you could fall or be hit.',
    aim: 'Raising the heart rate in a controlled way.',
  },
  {
    number: 3,
    name: 'Sport-specific exercise on your own',
    activity:
      'Running, skating or drills of your own sport, alone, with no risk of head impact. Adds direction changes and reaction.',
    aim: 'Adding movement and sport-specific demands.',
  },
  {
    number: 4,
    name: 'Non-contact training drills',
    activity:
      'Harder training drills with the team — passing, patterns, and progressive resistance training can start. Still nothing with contact.',
    aim: 'Exercise, coordination and thinking under load.',
    needsBaseline: true,
  },
  {
    number: 5,
    name: 'Full-contact practice',
    activity:
      'Normal training, contact included — only after a clinician has assessed you and cleared you for it.',
    aim: 'Restoring confidence, and letting coaching staff assess you.',
    needsBaseline: true,
    needsClearance: true,
  },
  {
    number: 6,
    name: 'Return to sport',
    activity: 'Normal competition.',
    aim: 'Back to playing.',
    needsBaseline: true,
    needsClearance: true,
  },
]

export function stagesFor(track: Track): readonly Stage[] {
  return track === 'learn' ? LEARN_STAGES : SPORT_STAGES
}

/* ------------------------------------------------------------------- rules */

/** The consensus minimum time at each stage before moving up. */
export const MIN_STAGE_HOURS = 24

/**
 * The tolerated symptom bump during a stage: a brief, mild increase that
 * settles within an hour. Anything beyond it means the stage was too much.
 */
export const TOLERATED_EXACERBATION_POINTS = 2

/** The stage someone drops back to when symptoms return during the contact stages. */
export const SPORT_REGRESSION_STAGE = 3

export type Tolerance = 'fine' | 'mild' | 'worse'

export interface ProtocolState {
  track: Track
  /** 1-based stage currently in progress. */
  stage: number
  /** ISO timestamp the current stage was started. */
  startedAt: string
  /** A clinician has cleared this person for contact. Only they can set it. */
  clinicianCleared: boolean
  /** Symptoms are back to where they were before the injury. */
  atBaseline: boolean
}

export interface AdvanceCheck {
  allowed: boolean
  /** Why not, written to be read by the person rather than logged. */
  reason?: string
  /** Hours still to wait, when that is what is blocking it. */
  hoursRemaining?: number
}

/**
 * May this person move up a stage right now?
 *
 * Every branch here is a refusal with a reason. A gate that says no without
 * saying why gets worked around, and the workaround for "the app will not let
 * me" is doing it anyway without telling anyone.
 */
export function canAdvance(
  state: ProtocolState,
  tolerance: Tolerance,
  now: Date = new Date(),
): AdvanceCheck {
  const stages = stagesFor(state.track)

  if (state.stage >= stages.length) {
    return { allowed: false, reason: 'You are already at the last stage of this ladder.' }
  }

  if (tolerance === 'worse') {
    return {
      allowed: false,
      reason:
        'Symptoms went up by more than a little, or took more than an hour to settle. That stage was too much for today — stay where you are, and try it again tomorrow.',
    }
  }

  const elapsedHours = (now.getTime() - new Date(state.startedAt).getTime()) / 3_600_000
  if (elapsedHours < MIN_STAGE_HOURS) {
    const hoursRemaining = Math.max(1, Math.ceil(MIN_STAGE_HOURS - elapsedHours))
    return {
      allowed: false,
      hoursRemaining,
      reason: `Each stage takes at least 24 hours. This one has about ${hoursRemaining} ${
        hoursRemaining === 1 ? 'hour' : 'hours'
      } left to run.`,
    }
  }

  const next = stages[state.stage] // 0-based index of the *next* stage

  if (next.needsBaseline && !state.atBaseline) {
    return {
      allowed: false,
      reason:
        'From this stage on, symptoms need to be back to your normal before you go further — not just mild. Keep repeating the current stage until they are.',
    }
  }

  if (next.needsClearance && !state.clinicianCleared) {
    return {
      allowed: false,
      reason:
        'Contact needs a clinician to assess you and clear you first. Mindful cannot do that and will not pretend to — bring your symptom record to the appointment.',
    }
  }

  return { allowed: true }
}

/** Move up one stage, restarting the 24-hour clock. */
export function advance(state: ProtocolState, now: Date = new Date()): ProtocolState {
  const stages = stagesFor(state.track)
  return {
    ...state,
    stage: Math.min(stages.length, state.stage + 1),
    startedAt: now.toISOString(),
  }
}

/**
 * Drop back after a bad day.
 *
 * On the learn ladder that is one step. On the sport ladder, a return of
 * symptoms during the contact stages sends someone back to stage 3 — the last
 * point at which they were exercising with no risk of another impact — rather
 * than one step down into a stage that could still hurt them.
 */
export function regress(state: ProtocolState, now: Date = new Date()): ProtocolState {
  const target =
    state.track === 'sport' && state.stage > SPORT_REGRESSION_STAGE
      ? SPORT_REGRESSION_STAGE
      : Math.max(1, state.stage - 1)

  return { ...state, stage: target, startedAt: now.toISOString() }
}

export function startProtocol(track: Track, now: Date = new Date()): ProtocolState {
  return {
    track,
    stage: 1,
    startedAt: now.toISOString(),
    clinicianCleared: false,
    atBaseline: false,
  }
}

export function currentStage(state: ProtocolState): Stage {
  const stages = stagesFor(state.track)
  return stages[Math.min(stages.length, Math.max(1, state.stage)) - 1]
}

/** How the tolerance question is put, in the words of the rule behind it. */
export const TOLERANCE_OPTIONS: readonly { value: Tolerance; label: string; detail: string }[] = [
  { value: 'fine', label: 'No worse', detail: 'Symptoms stayed where they were.' },
  {
    value: 'mild',
    label: 'A little worse, briefly',
    detail: 'Up by no more than 2 out of 10, and settled within an hour.',
  },
  {
    value: 'worse',
    label: 'Worse than that',
    detail: 'A bigger jump, or it lasted more than an hour.',
  },
]
