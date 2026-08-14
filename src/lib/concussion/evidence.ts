/**
 * Where every clinical claim in the recovery feature comes from.
 *
 * Mindful makes no health claims in its own name. That rule already governs
 * the reflection library; it governs this feature absolutely, because
 * concussion recovery is a domain where confident wrong advice does real
 * neurological harm and where the temptation to sound authoritative is
 * strongest. So every stage, every threshold and every "wait 24 hours" in this
 * folder is traceable to a named body, and the citation travels with the
 * guidance to the screen rather than living in a credits page.
 *
 * The guidance is paraphrased in plain English rather than reproduced. The
 * consensus tables and the SCAT are the work of the people who wrote them, and
 * a hackathon prototype should not be passing off a clinical instrument as its
 * own screen furniture.
 *
 * Retrieved and checked on 2026-08-14. Guidance changes; this file is a
 * snapshot with a date on it, and the app says so where someone can see it.
 */

export type EvidenceSourceId =
  | 'cdc'
  | 'amsterdam'
  | 'living-guidelines'
  | 'pedsconcussion'
  | 'concussion-alliance'
  | 'screen-time-rct'
  | 'aerobic-exercise'
  | 'giza-hovda'
  | 'ponsford'

export interface EvidenceSource {
  id: EvidenceSourceId
  name: string
  /** What it is, in one line, so a citation is informative rather than decorative. */
  what: string
  url: string
}

export const EVIDENCE_SOURCES: Readonly<Record<EvidenceSourceId, EvidenceSource>> = {
  cdc: {
    id: 'cdc',
    name: 'CDC HEADS UP',
    what: 'The US public health agency’s concussion guidance for the public, including the danger signs that mean emergency care.',
    url: 'https://www.cdc.gov/heads-up/guidelines/index.html',
  },
  amsterdam: {
    id: 'amsterdam',
    name: 'Amsterdam consensus statement (2023)',
    what: 'The 6th International Consensus Statement on Concussion in Sport, Patricios et al., British Journal of Sports Medicine — the source of the graduated return-to-learn and return-to-sport strategies.',
    url: 'https://bjsm.bmj.com/content/57/11/695',
  },
  'living-guidelines': {
    id: 'living-guidelines',
    name: 'Living Concussion Guidelines',
    what: 'The Canadian living guideline for concussion and prolonged symptoms in adults 18 and over — re-reviewed against new evidence at least every six months.',
    url: 'https://concussionsontario.org',
  },
  pedsconcussion: {
    id: 'pedsconcussion',
    name: 'PedsConcussion Living Guideline',
    what: 'The living guideline for diagnosing and managing pediatric concussion — the reference for anyone under 18, where recovery differs from adults.',
    url: 'https://pedsconcussion.com',
  },
  'concussion-alliance': {
    id: 'concussion-alliance',
    name: 'Concussion Alliance',
    what: 'A non-profit that summarises current concussion research for patients and clinicians.',
    url: 'https://www.concussionalliance.org',
  },
  'screen-time-rct': {
    id: 'screen-time-rct',
    name: 'Macnow et al., JAMA Pediatrics (2021)',
    what: 'A randomised trial on screen use in the first 48 hours after concussion, and the later work on moderate rather than zero screen time.',
    url: 'https://jamanetwork.com/journals/jamapediatrics/fullarticle/2783638',
  },
  'aerobic-exercise': {
    id: 'aerobic-exercise',
    name: 'Leddy et al., sub-symptom threshold aerobic exercise',
    what: 'Randomised evidence that light aerobic exercise below the level that worsens symptoms, started after the first 48 hours, speeds recovery.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30715132/',
  },
  'giza-hovda': {
    id: 'giza-hovda',
    name: 'Giza & Hovda, “The New Neurometabolic Cascade of Concussion” (Neurosurgery, 2014)',
    what: 'The standard account of what happens in the brain after a concussion: ionic flux, an energy crisis, and a window of vulnerability.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25232881/',
  },
  ponsford: {
    id: 'ponsford',
    name: 'Ponsford et al. (J Neurol Neurosurg Psychiatry, 2002)',
    what: 'Trial evidence that early education about concussion — what to expect, and that symptoms usually resolve — itself reduces ongoing symptoms.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/12185174/',
  },
}

export interface Guidance {
  id: string
  title: string
  /** The guidance itself, hedged and attributed in the wording. */
  body: string
  sourceId: EvidenceSourceId
  /** Where this connects to something Mindful can actually do. */
  inApp?: { label: string; to: string }
}

/**
 * What current guidance actually says, including the parts that changed.
 *
 * The rest advice is the one most worth stating plainly: "sit in a dark room
 * until it passes" was standard for years and is no longer what the evidence
 * supports. Someone recovering today is likely to be told the old version by
 * a well-meaning relative, and an app that quietly agrees with the relative is
 * worse than useless.
 */
export const GUIDANCE: readonly Guidance[] = [
  {
    id: 'relative-rest',
    title: 'Rest for the first day or two, then start moving',
    body: 'Current guidance is relative rest for the first 24 to 48 hours — not a dark room, and not bed rest for a week. After that, the Amsterdam consensus supports a gradual return to activity rather than waiting until every symptom has gone. Prolonged strict rest is no longer recommended and can make recovery slower.',
    sourceId: 'amsterdam',
  },
  {
    id: 'aerobic',
    title: 'Light exercise below your symptom threshold helps',
    body: 'Randomised trials found that light aerobic activity — walking or stationary cycling at an intensity just below the level that makes symptoms worse — started after the first 48 hours, safely speeds recovery. The intensity that is right for you is a clinical judgement, and an exercise test is how it is normally set.',
    sourceId: 'aerobic-exercise',
  },
  {
    id: 'screens',
    title: 'Screens: very little at first, then moderation rather than a ban',
    body: 'Guidance suggests keeping screen time to around an hour a day for the first 48 hours. After that the evidence points to moderation rather than abstinence: in a randomised trial, teenagers allowed some recreational screen time did not do worse, and complete restriction was associated with poorer psychological recovery.',
    sourceId: 'screen-time-rct',
  },
  {
    id: 'sleep',
    title: 'Sleep is part of the treatment',
    body: 'Disturbed sleep is one of the most common symptoms after a concussion and one of the strongest predictors of a slower recovery. Keeping regular hours, and treating sleep as recovery rather than lost time, is standard advice.',
    sourceId: 'concussion-alliance',
    inApp: { label: 'Track how you are sleeping', to: '/mood' },
  },
  {
    id: 'mood',
    title: 'Low mood and anxiety after a head injury are expected, not a weakness',
    body: 'Anxiety and depression are common after concussion, both as a direct effect and as a response to being unwell and out of your life for weeks. They are also treatable, and they are worth telling a clinician about rather than waiting out.',
    sourceId: 'concussion-alliance',
    inApp: { label: 'Take a PHQ-9 or GAD-7 self-check', to: '/self-check' },
  },
  {
    id: 'light-sound',
    title: 'If light and screens hurt, you should not have to look at one',
    body: 'Sensitivity to light and noise is among the most common concussion symptoms, which makes most self-care apps unusable at exactly the point they are needed. Mindful’s breathing session can run with the screen dimmed and a voice leading it, so it needs no looking at.',
    sourceId: 'cdc',
    inApp: { label: 'Breathe with your eyes closed', to: '/breathe' },
  },
  {
    id: 'persisting',
    title: 'If it is still going after four weeks, that has a name and a treatment',
    body: 'Most people recover within two to four weeks. Symptoms continuing beyond about four weeks are described as persisting symptoms after concussion — which is common, is not a sign that you have done something wrong, and is a reason to be assessed rather than to keep waiting.',
    sourceId: 'amsterdam',
  },
  {
    id: 'living-guideline',
    title: 'Prolonged symptoms have a whole guideline of their own',
    body: 'The Living Concussion Guidelines cover assessment and management of concussion and prolonged symptoms in adults, domain by domain — headache, sleep, fatigue, mental health, return to activity — and are re-reviewed against new evidence at least every six months. If your recovery is taking longer than expected, this is the playbook your clinician is likely working from, and it is public.',
    sourceId: 'living-guidelines',
  },
  {
    id: 'pediatric',
    title: 'Children and teenagers are not small adults here',
    body: 'Under-18 recovery is covered by its own living guideline, PedsConcussion. The broad shape is the same — relative rest, then gradual return, school before sport — but the specifics differ, recovery tends to take longer in adolescents, and school support matters more. If this is about a child or teenager, involve a clinician early and use the pediatric guidance as the reference.',
    sourceId: 'pedsconcussion',
  },
]

/**
 * What this feature cannot do, said before anyone relies on it.
 *
 * Every line here is a real limitation rather than legal throat-clearing. An
 * app that tracks a protocol will be read as authorising the next step unless
 * it says otherwise, repeatedly and specifically.
 */
export const LIMITATIONS: readonly string[] = [
  'This does not diagnose a concussion. Only a clinician can do that, and a normal-looking symptom score does not mean you have not had one.',
  'It is built around guidance for adults. For anyone under 18, the PedsConcussion living guideline is the reference, recovery timelines differ, and a clinician should be involved early.',
  'This never clears you to return to contact or competition. That decision is a clinician’s, it is required before full-contact practice, and no app can make it for them.',
  'It knows nothing about your medical history, your medication, your previous head injuries, or how this one happened — all of which change the right plan.',
  'The stages here are the general published strategy. If a clinician has given you a different plan, theirs is the one to follow.',
  'Danger signs can appear hours or days after the injury. Read them again if anything changes, and do not wait for a symptom check to tell you.',
]

export function evidenceSource(id: EvidenceSourceId): EvidenceSource {
  return EVIDENCE_SOURCES[id]
}

/** The date the guidance above was checked, shown next to it. */
export const GUIDANCE_CHECKED = '2026-08-14'
