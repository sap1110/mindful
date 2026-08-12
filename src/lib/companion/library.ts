/**
 * The starter library: things to try, from sources that are allowed to say so.
 *
 * Mindful's reflection feature normally answers out of the person's own
 * history. Someone who installed it an hour ago has no history, and an empty
 * screen is a bad first impression of a mental-health app — so this corpus
 * fills the gap until their own writing can.
 *
 * Three rules govern every card below.
 *
 * 1. **Mindful makes no health claims of its own.** Every card names the body
 *    that said it. The app is a delivery mechanism for other people's
 *    guidance, not an authority, and the wording never lets that blur.
 * 2. **"May help", never "will fix".** These are things that are commonly
 *    suggested and that some people find useful. Promising an outcome to
 *    someone in distress is a cruelty dressed as encouragement.
 * 3. **Fetched once, at build time, and frozen here.** No runtime network call
 *    fetches any of this. Mindful's promise is that nothing leaves the device,
 *    and a live content feed would quietly turn every reflection into a
 *    request carrying what the person just typed.
 *
 * Content was retrieved on 2026-08-13. Licences are recorded per source below
 * and reproduced in the README; the hackathon rules require attribution and
 * these bodies deserve it regardless.
 */

export type LibrarySourceId = 'nhs' | 'nimh' | 'medlineplus' | 'who' | 'nccih'

export interface LibrarySource {
  id: LibrarySourceId
  name: string
  url: string
  /** Why reproducing this is permitted. */
  licence: string
}

export const LIBRARY_SOURCES: Readonly<Record<LibrarySourceId, LibrarySource>> = {
  nhs: {
    id: 'nhs',
    name: 'NHS',
    url: 'https://www.nhs.uk/mental-health/',
    licence: 'Contains public sector information licensed under the Open Government Licence v3.0.',
  },
  nimh: {
    id: 'nimh',
    name: 'National Institute of Mental Health (NIMH)',
    url: 'https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health',
    licence: 'US federal government work — in the public domain.',
  },
  medlineplus: {
    id: 'medlineplus',
    name: 'MedlinePlus (US National Library of Medicine)',
    url: 'https://medlineplus.gov/howtoimprovementalhealth.html',
    licence: 'US federal government work — in the public domain.',
  },
  who: {
    id: 'who',
    name: 'World Health Organization (WHO)',
    url: 'https://www.who.int/news-room/questions-and-answers/item/stress',
    licence: '© WHO. Reproduced under CC BY-NC-SA 3.0 IGO; not an endorsement of Mindful.',
  },
  nccih: {
    id: 'nccih',
    name: 'National Center for Complementary and Integrative Health (NCCIH)',
    url: 'https://www.nccih.nih.gov/health/meditation-and-mindfulness-what-you-need-to-know',
    licence: 'US federal government work — in the public domain.',
  },
}

export interface LibraryCard {
  id: string
  title: string
  /** The guidance itself, attributed in the copy and hedged. */
  body: string
  /** Verbatim wording from the source, where quoting is clearer than paraphrase. */
  quote?: string
  source: LibrarySourceId
  /**
   * Ways a person might describe the problem this addresses, in their own
   * words. Embedded alongside the body so that "I can't switch my brain off"
   * can reach the sleep card, which never uses those words. Retrieval quality
   * lives or dies on this field.
   */
  cues: readonly string[]
}

export const LIBRARY: readonly LibraryCard[] = [
  {
    id: 'nhs-calm-breathing',
    title: 'A longer, slower breath',
    body:
      'The NHS describes a calming breathing exercise: let your breath go as deep into your belly as is comfortable without forcing it, breathe in through your nose and out through your mouth, counting steadily from 1 to 5 each way — or as far as is comfortable to start with. They suggest keeping it up for at least 5 minutes, and say it tends to be most useful as a regular habit rather than only in a crisis. Mindful has a guided version on the Breathe screen.',
    quote: 'Let your breath flow as deep down into your belly as is comfortable, without forcing it.',
    source: 'nhs',
    cues: [
      'my chest feels tight and I cannot calm down',
      'I am panicking and my breathing is fast',
      'I feel wound up and restless',
      'I need to settle down right now',
      'anxiety attack, racing heart',
    ],
  },
  {
    id: 'nimh-walking',
    title: 'Thirty minutes of walking',
    body:
      'NIMH says that just 30 minutes of walking every day can boost your mood and improve your health, and notes that it does not have to happen all at once — smaller amounts add up. It is one of the more consistently recommended things across every source here, which is partly why it is worth mentioning even though it sounds too simple to matter.',
    quote: 'Just 30 minutes of walking every day can boost your mood and improve your health.',
    source: 'nimh',
    cues: [
      'I have no energy and I have not left the house',
      'I feel sluggish and flat',
      'I have been inside all day',
      'I cannot motivate myself to do anything',
      'stuck indoors, low mood, no motivation',
    ],
  },
  {
    id: 'who-sleep-hygiene',
    title: 'Making sleep more likely',
    body:
      'The WHO suggests going to bed and getting up at consistent times, keeping the room quiet, dark and at a comfortable temperature, limiting screens before bed, and avoiding large meals and caffeine close to sleep. They frame these as things that make sleep more likely rather than guaranteed — which is worth holding onto on the nights they do not work.',
    quote: 'quiet, dark, relaxing and at a comfortable temperature',
    source: 'who',
    cues: [
      'I cannot sleep and my mind will not switch off',
      'I keep waking up in the night',
      'I am exhausted but wired',
      'lying awake for hours overthinking',
      'insomnia, bad sleep, tired all the time',
    ],
  },
  {
    id: 'who-routine',
    title: 'A shape to the day',
    body:
      'The WHO suggests keeping a daily routine — regular meals, time with people, exercise, chores and something recreational. The reasoning they give is not that routine is virtuous, but that having a shape to the day is one of the things that tends to go first when stress builds, and getting it back is something you can act on directly.',
    source: 'who',
    cues: [
      'my days all blur into each other',
      'I have no structure and I am drifting',
      'everything feels chaotic and out of control',
      'I cannot get anything done',
      'lost track of days, no routine',
    ],
  },
  {
    id: 'nimh-gratitude',
    title: 'Naming specific good things',
    body:
      'NIMH suggests reminding yourself daily of things you are grateful for, and is specific about being specific: write them down or replay them in your mind, rather than reaching for a general sense of thankfulness. Mindful has a journal if writing helps; it is equally fine not to write.',
    quote: 'Remind yourself daily of things you are grateful for. Be specific.',
    source: 'nimh',
    cues: [
      'everything feels negative and nothing is going right',
      'I only notice what is going wrong',
      'I cannot see anything good',
      'stuck in a negative spiral',
    ],
  },
  {
    id: 'nimh-reach-out',
    title: 'Telling one person',
    body:
      'NIMH suggests reaching out to friends or family who can offer emotional support and practical help. The WHO puts it similarly — keep in touch with people you trust and share what is going on. Neither treats this as easy, and it often is not, particularly when the thing you would have to explain is that you do not know what is wrong.',
    quote:
      'Reach out to friends or family members who can provide emotional support and practical help.',
    source: 'nimh',
    cues: [
      'I feel completely alone in this',
      'I have not spoken to anyone in days',
      'nobody would understand',
      'I do not want to burden anyone',
      'isolated, lonely, withdrawn',
    ],
  },
  {
    id: 'medlineplus-relaxation',
    title: 'Relaxation techniques worth knowing about',
    body:
      'MedlinePlus lists five approaches used to prompt what it calls the body\'s natural relaxation response: progressive muscle relaxation, guided imagery, biofeedback, self-hypnosis and deep breathing. They are described as things that can be learned, which is a useful framing — not working the first time is not evidence that they will not work.',
    source: 'medlineplus',
    cues: [
      'I am tense all the time and cannot relax',
      'my body is holding stress',
      'I cannot wind down',
      'jaw clenched, shoulders tight',
    ],
  },
  {
    id: 'medlineplus-meditation',
    title: 'Meditation, described plainly',
    body:
      'MedlinePlus describes meditation as a mind and body practice where you learn to focus your attention and awareness — usually a quiet space, a comfortable position, and attention on your breath or on a chosen word. Described that way it is a skill rather than a personality trait, which may make it feel less like something other people are simply better at.',
    quote:
      'a mind and body practice where you learn to focus your attention and awareness',
    source: 'medlineplus',
    cues: [
      'my thoughts are racing and I cannot focus',
      'I cannot quiet my mind',
      'my head is too loud',
      'overthinking everything',
    ],
  },
  {
    id: 'who-limit-news',
    title: 'Turning the volume down',
    body:
      'The WHO suggests limiting time spent following the news if it increases your stress. MedlinePlus makes a similar point about upsetting news and social media. Both are careful to frame it as limiting rather than avoiding — the suggestion is about dosage, not about being uninformed.',
    quote: 'Limit the time you spend following the news if it increases your stress.',
    source: 'who',
    cues: [
      'the news is making me feel hopeless about everything',
      'I keep scrolling and feeling worse',
      'doomscrolling',
      'the world feels awful',
    ],
  },
  {
    id: 'nimh-goals',
    title: 'Fewer things, and saying so',
    body:
      'NIMH suggests prioritising what actually needs doing, declining new commitments when you are already overwhelmed, and noticing what you did manage rather than only what you did not. The permission to decline is the part people tend to skip.',
    source: 'nimh',
    cues: [
      'I have too much on and I am drowning',
      'everyone wants something from me',
      'I am overwhelmed and behind on everything',
      'burnt out, too many commitments',
    ],
  },
  {
    id: 'who-seek-help',
    title: 'When it is worth asking someone qualified',
    body:
      'The WHO puts it simply: if you are having difficulty coping with stress, it is worth seeking help from a trusted health-care provider or another trusted person in your community. There is no threshold you have to cross first, and not being sure whether it is serious enough is a very common reason people wait longer than they needed to.',
    quote:
      'If we have difficulties coping with stress, we should seek help from a trusted health-care provider or from another trusted person in our community.',
    source: 'who',
    cues: [
      'I do not know if this is bad enough to see someone',
      'should I talk to a doctor about this',
      'I have felt like this for months and it is not lifting',
      'nothing I try is working',
    ],
  },
  {
    id: 'who-what-mental-health-is',
    title: 'What "mental health" actually refers to',
    body:
      'The WHO defines mental health as a state of well-being that lets people cope with the stresses of life, realise their abilities, learn and work well, and contribute to their community. Notably it is not defined as the absence of difficulty — which means having a hard week is not evidence of failing at it.',
    quote:
      'a state of mental well-being that enables people to cope with the stresses of life, realize their abilities, learn and work well, and contribute to their community',
    source: 'who',
    cues: [
      'am I mentally ill or just struggling',
      'what does mental health even mean',
      'I feel like I am failing at coping',
      'is this normal to feel',
    ],
  },
  {
    id: 'nhs-mindfulness-everyday',
    title: 'Mindfulness without sitting down',
    body:
      'The NHS describes mindfulness as paying attention to what is going on inside and outside ourselves, moment by moment — and most of its suggestions do not involve meditating at all. Notice the texture of ordinary things, or the taste of food, or the air while walking. Pick a regular moment, like a commute, and use it deliberately. Change a routine — sit somewhere different — so the day stops running on autopilot.',
    quote: 'paying attention to what is going on inside and outside ourselves, moment by moment',
    source: 'nhs',
    cues: [
      'I am going through the motions and not really present',
      'the days pass without me noticing',
      'I feel disconnected from everything',
      'autopilot, numb, not really here',
      'how do I do mindfulness without meditating',
    ],
  },
  {
    id: 'nhs-naming-thoughts',
    title: 'Naming a thought as a thought',
    body:
      'The NHS suggests silently labelling what is happening — "here\'s the thought that I might fail that exam" — and watching thoughts as passing mental events rather than trying to get rid of them. The distinction it draws is between having a thought and being it. It also notes that gentle movement, like walking or yoga, can be easier than sitting still when your mind is busy.',
    quote: "Here's the thought that I might fail that exam",
    source: 'nhs',
    cues: [
      'I keep having the same worried thought over and over',
      'I cannot stop catastrophising',
      'my thoughts feel like facts',
      'intrusive repetitive thoughts, rumination',
    ],
  },
  {
    id: 'nhs-sitting-meditation',
    title: 'Plain sitting meditation',
    body:
      'The NHS describes mindfulness meditation simply: sit quietly and pay attention to your thoughts, to sounds, to the sensations of breathing, or to parts of your body — and when your mind wanders, bring your attention back. That is the whole practice. The wandering is not a failure of it; noticing and returning is the thing being practised.',
    quote:
      'mindfulness meditation involves sitting silently and paying attention to thoughts, sounds, the sensations of breathing or parts of the body',
    source: 'nhs',
    cues: [
      'how do I actually meditate',
      'I want to try meditation but do not know where to start',
      'I am bad at meditating my mind wanders',
      'simple meditation for beginners',
    ],
  },
  {
    id: 'nccih-evidence-honestly',
    title: 'What the evidence on meditation actually says',
    body:
      'Worth knowing before trying it. NCCIH reports that mindfulness-based approaches for anxiety and depression did better than no treatment and worked about as well as established therapies — but is blunt that much of the research has been preliminary or not scientifically rigorous, and may have been interpreted too optimistically. It also notes that few studies have looked for harmful effects, and that one 2020 review found about 8 percent of participants had a negative effect from practising meditation. So: worth a try, genuinely not for everyone, and stopping if it makes things worse is a reasonable thing to do rather than a failure.',
    quote:
      'Much of the research on these topics has been preliminary or not scientifically rigorous',
    source: 'nccih',
    cues: [
      'does meditation actually work or is it hype',
      'is there real evidence for mindfulness',
      'meditation made me feel worse',
      'I do not want to be sold wellness nonsense',
    ],
  },
  {
    id: 'nhs-talking-therapies-access',
    title: 'You may not need to see a GP first',
    body:
      'For many common problems, including anxiety and depression, the NHS says you can refer yourself to talking therapies without speaking to a GP — you need to be registered with one and be 18 or over, or 16 in some areas. A GP referral is needed for some other conditions. What is on offer includes guided self-help, CBT, counselling, interpersonal therapy, EMDR and mindfulness-based cognitive therapy, delivered in person, by video or phone, online, one-to-one or in groups. Outside the UK the route differs, but the point stands that there is often a way in that does not require an appointment first.',
    quote:
      'you can refer yourself to NHS talking therapies without speaking to a GP',
    source: 'nhs',
    cues: [
      'how do I actually get therapy',
      'do I need a doctor referral to see a therapist',
      'I want help but do not know where to start',
      'what kinds of therapy are there',
      'how to access mental health support',
    ],
  },
]

/** The text that actually gets embedded: title, body and the cue phrasings. */
export function libraryEmbeddingText(card: LibraryCard): string {
  return [card.title, card.body, ...card.cues].join('\n')
}

export function librarySource(card: LibraryCard): LibrarySource {
  return LIBRARY_SOURCES[card.source]
}
