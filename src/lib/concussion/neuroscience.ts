import type { EvidenceSourceId } from './evidence'

/**
 * What is actually happening in the brain — and why it changes the design.
 *
 * This section earns its place twice over. First, it is itself treatment:
 * trial evidence (Ponsford et al., 2002) found that people given early
 * education about concussion — what the symptoms are, why they happen, that
 * they usually resolve — went on to have fewer ongoing symptoms than people
 * who were not. Understanding that the fog and the fatigue are the injury, not
 * a personal failing and not permanent damage, measurably helps.
 *
 * Second, every rule this feature enforces has a mechanism behind it, and
 * stating the mechanism is what separates a protocol someone follows from one
 * they merely obey. "Wait 24 hours" invites bargaining; "your neurons are
 * running a costly cleanup on a reduced fuel supply" explains why the waiting
 * is the treatment.
 *
 * The register rules are the same as everywhere else in Mindful: hedged where
 * the science is hedged (the glymphatic story is explicitly flagged as resting
 * largely on animal work), attributed by name, and free of any claim the cited
 * source does not make. Each card ends with `design` — the specific place in
 * this app where the mechanism became a behaviour — because a neuroscience
 * section that changes nothing about the product is decoration.
 */

export interface NeuroscienceNote {
  id: string
  title: string
  /** The mechanism, in plain words, hedged where the evidence is. */
  body: string
  /** Where this mechanism shows up in how the app behaves. */
  design: string
  sourceId: EvidenceSourceId
}

export const NEUROSCIENCE_NOTES: readonly NeuroscienceNote[] = [
  {
    id: 'energy-crisis',
    title: 'An injury of function, not structure',
    body:
      'A concussion usually shows nothing on a CT or MRI scan because it is not a bleed or a bruise — it is a disturbance in how neurons work. The jolt stretches brain cells and opens their ion channels: potassium floods out, calcium floods in, and the neurotransmitter glutamate is released indiscriminately. The brain’s pumps then have to work flat out to restore the balance, which costs energy — at the very moment blood flow to the brain is reduced. That mismatch between energy demand and energy supply, described by Giza and Hovda as the neurometabolic cascade, is thought to underlie the early symptoms.',
    design:
      'This is why the app never treats a clear scan or a low symptom score as proof that nothing happened, and why the first 24 to 48 hours are protected as relative rest.',
    sourceId: 'giza-hovda',
  },
  {
    id: 'cognitive-fatigue',
    title: 'Why thinking is suddenly exhausting',
    body:
      'While the energy supply is short, the brain also works less efficiently: imaging studies show it recruiting wider networks to manage tasks that used to run on autopilot. The result is that an hour of homework or a normal shift costs far more than it used to — and the crash afterwards is the metabolism, not laziness or lack of will. Concentration, memory and “fog” symptoms are this same mechanism felt from the inside.',
    design:
      'It is why the return-to-learn ladder increases cognitive load as deliberately as the sport ladder increases physical load, and why its stages start at minutes of concentration rather than hours.',
    sourceId: 'giza-hovda',
  },
  {
    id: 'vulnerability-window',
    title: 'Why a second knock is different from the first',
    body:
      'During the energy crisis the brain is unusually vulnerable. A second impact before recovery tends to produce worse and longer-lasting symptoms than the first, and in rare cases in children and adolescents it can trigger catastrophic brain swelling. The danger is highest precisely when someone feels nearly fine, because feeling fine at rest is not the same as the metabolism having recovered.',
    design:
      'This window is the entire reason the sport ladder exists: the same-day no-return rule, the requirement to be back at baseline before contact stages, and the drop back to stage 3 — the last stage with no impact risk — if symptoms return.',
    sourceId: 'amsterdam',
  },
  {
    id: 'exercise-regulation',
    title: 'Why gentle exercise helps but pushing makes it worse',
    body:
      'Concussion disturbs the systems that regulate blood flow to the brain and the autonomic nervous system that sets heart rate and blood pressure — one reason symptoms spike with exertion. Controlled aerobic exercise below the level that provokes symptoms appears to help restore that regulation, which is why guidance moved away from strict rest: the randomised trials found that prescribed sub-threshold exercise after the first 48 hours speeds recovery rather than risking it. The threshold is the point; charging past it is not more of the same medicine.',
    design:
      'The tolerated-exacerbation rule — no more than a mild, brief symptom bump, settling within an hour — is this threshold, expressed as something a person can actually check.',
    sourceId: 'aerobic-exercise',
  },
  {
    id: 'sleep-clearance',
    title: 'Why sleep is part of the repair',
    body:
      'Sleep is when the brain does much of its housekeeping — including, in work done largely in animals so far, clearing metabolic waste through the glymphatic system. After a concussion, sleep is commonly disrupted at exactly the time it is most needed, and disturbed sleep is one of the stronger predictors of a slower recovery. The guidance is unglamorous and consistent: regular hours, wind down without screens, and treat a night’s sleep as recovery rather than lost time.',
    design:
      'It is why sleep has its own item in the symptom check, and why the app’s mood tracking — which records sleep-adjacent patterns day by day — is linked from the recovery screen rather than kept in a separate world.',
    sourceId: 'living-guidelines',
  },
  {
    id: 'education-works',
    title: 'Understanding this page is itself treatment',
    body:
      'In a controlled trial, people seen a week after a mild head injury and given structured information — what symptoms to expect, why they happen, and how to manage the return to activity — reported fewer symptoms and less anxiety three months later than people who were not. Uncertainty amplifies symptoms; an accurate model of what is happening quiets it. That is not a platitude, it is a measured effect.',
    design:
      'It is why this section exists at all, why the symptom check reports change without alarm, and why the trajectory language everywhere in Mindful states what the record shows rather than dramatising it.',
    sourceId: 'ponsford',
  },
]
