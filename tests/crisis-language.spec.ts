import { expect, test } from '@playwright/test'
import { assessRisk } from '../src/lib/echo/safety'

/**
 * The crisis guard, tested in the language people actually use.
 *
 * This battery runs in Node against the assessment function directly, because
 * its value is breadth: dozens of phrasings, cheap enough to run on every
 * change. The browser tests in echo.spec.ts prove the guard is *wired in*;
 * this proves it *understands*.
 *
 * Three registers matter and are all represented: the tidy sentence, the
 * unpunctuated phone typing, and the moderation-era euphemisms ("kms",
 * "unalive") that are now the primary phrasing for many young people. A guard
 * that only catches the clinical wording works worst for the group at highest
 * risk.
 *
 * The negative battery is just as load-bearing. English is full of idioms that
 * borrow this vocabulary — a deadline that is "killing" someone, a phone that
 * "died" — and a guard that interrupted every one of them with a helpline
 * would train people to stop typing honestly, which is its own failure mode.
 */

/** Every one of these must stop retrieval and show crisis support. */
const ACUTE: readonly string[] = [
  // Direct statements, tidy and untidy.
  'I have been thinking about killing myself',
  'i want to kill myself',
  'I do not want to be here anymore',
  'i dont want to be here anymore',
  'I don’t want to exist',
  'I want to die',
  'i just want to die',
  'I wish I was dead',
  'wish i were dead honestly',
  'I would rather be dead',
  'I want to be dead',
  'thinking about ending my life',
  'I am going to take my own life',
  'there is no point in living',
  'my life is not worth living',
  'life isnt worth living anymore',
  'I have a plan to end it',
  'I am thinking of ending it all',
  'I have been hurting myself',
  'I cut myself again last night',
  'I have been self-harming',
  'self harm is the only thing that helps',
  // Phone typing: contractions collapsed, no punctuation.
  'i dont wanna be here anymore',
  'don’t wanna wake up tomorrow',
  'i wanna die',
  // The euphemisms and abbreviations.
  'kms',
  'gonna kms at this point',
  'I want to unalive myself',
  'thinking about unaliving',
  'might just off myself',
  'thought about offing myself today',
  // Categories the audit against real statements showed the guard missing.
  // These are written here rather than copied from that corpus — see
  // scripts/audit-crisis-guard.ts for why none of it is reproduced.
  'I just want to end it',
  'should I end it',
  'what is the most painless way to die',
  'looking for a painless way to go',
  'how many pills would be lethal',
  'would that lead to death',
  'I am going to overdose tonight',
  'I took 40 tablets an hour ago',
  'I want to slit my wrists',
  'I held a knife to my chest',
  'I do not deserve to be alive',
  'I should just die',
  'I want it all to stop',
  'I wrote a suicide note',
  'I attempted suicide last year',
]

/** Heavy, but not an emergency — support offered alongside, not instead. */
const CONCERN: readonly string[] = [
  'everything feels hopeless',
  'nothing will ever get better',
  'I feel completely alone',
  'i cant take this anymore',
  'I feel trapped and there is no way out',
  'I feel nothing at all, just numb',
  'I hate myself',
  'I am a burden to everyone',
]

/** Ordinary dark-flavoured English that must NOT trigger the interrupt. */
const BENIGN: readonly string[] = [
  'this deadline is killing me',
  'I could murder a coffee right now',
  'my phone died on the way home',
  'I am dead tired after work',
  'the traffic today was murder',
  'my legs died halfway up the hill',
  'we killed it in the presentation today',
  'I am dying to see them again',
  'that joke killed me',
  'the plant on my desk is dead',
  'trying to kill some time before my appointment',
  'the party was dead by ten',
  // Guards against the new patterns over-reaching.
  'I want this headache to stop',
  'I took the bins out an hour ago',
  'the best way to go is by train',
  'I attempted the exam twice',
  'I wrote a note to my teacher',
]

test.describe('acute language is caught', () => {
  for (const phrase of ACUTE) {
    test(`"${phrase}"`, () => {
      const risk = assessRisk(phrase)
      expect(risk.level, `matched: ${risk.matched}`).toBe('acute')
    })
  }
})

test.describe('heavy language raises concern without interrupting', () => {
  for (const phrase of CONCERN) {
    test(`"${phrase}"`, () => {
      const risk = assessRisk(phrase)
      expect(risk.level, `matched: ${risk.matched}`).toBe('concern')
    })
  }
})

test.describe('everyday idiom is left alone', () => {
  for (const phrase of BENIGN) {
    test(`"${phrase}"`, () => {
      const risk = assessRisk(phrase)
      expect(risk.level, `matched: ${risk.matched}`).toBe('none')
    })
  }
})

test.describe('precedence and casing', () => {
  test('acute wins when both are present', () => {
    expect(assessRisk('I feel hopeless and I want to die').level).toBe('acute')
  })

  test('case and unicode make no difference', () => {
    expect(assessRisk('I WANT TO DIE').level).toBe('acute')
    expect(assessRisk('ＫＭＳ').level).toBe('acute') // full-width, NFKC-folded
  })
})
