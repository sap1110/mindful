import { expect, test } from '@playwright/test'
import {
  JOURNAL_KEY,
  MOODS_KEY,
  expectNoA11yViolations,
  readStore,
  seedProfile,
  settle,
} from './helpers'

const TOUR_SEEN_KEY = 'mindful.v1.tour.seen'

/** Every step, in order, by the heading it leads with. */
const HEADINGS = [
  'Nothing you type here leaves this device.',
  'One tap, most days. That is the whole habit.',
  'A prompt if you want one. A blank page if you do not.',
  'Twelve seconds is a real session.',
  'It answers from published evidence, or it says it cannot.',
  'Where Mindful stops being an app about feelings.',
  'Take it with you, or take it away.',
]

test.describe('the guided tour', () => {
  test('opens without a profile, because that is the point of it', async ({ page }) => {
    await page.goto('/tour')

    await expect(page.getByRole('heading', { level: 1, name: HEADINGS[0] })).toBeVisible()
    // Not bounced to the onboarding gate.
    await expect(page).toHaveURL(/\/tour/)
    await expect(page.getByRole('link', { name: 'Skip the tour' })).toBeVisible()
  })

  test('checks the privacy claim in front of you, and it holds', async ({ page }) => {
    await page.goto('/tour')

    const offOrigin = page.getByText('To any other server')
    await expect(offOrigin).toBeVisible()

    // The count itself, not the copy around it.
    await expect(page.getByText('Nothing has been sent anywhere else.')).toBeVisible()
    await expect(page.getByText('none', { exact: true })).toBeVisible()
  })

  test('walks all seven steps and lands somewhere sensible', async ({ page }) => {
    await page.goto('/tour')

    for (const [index, heading] of HEADINGS.entries()) {
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      // Exact: the progress trail carries the same words for screen readers.
      await expect(
        page.getByText(`${index + 1} of ${HEADINGS.length}`, { exact: true }),
      ).toBeVisible()
      if (index < HEADINGS.length - 1) {
        await page.getByRole('button', { name: 'Next' }).click()
      }
    }

    // No profile, so the last step offers to make one rather than pretending
    // there is a space to go back to.
    await page.getByRole('button', { name: 'Get started' }).click()
    await expect(page).toHaveURL(/\/onboarding/)
  })

  test('any single step can be linked to directly', async ({ page }) => {
    await page.goto('/tour?step=ask')

    await expect(page.getByRole('heading', { level: 1, name: HEADINGS[4] })).toBeVisible()
    await expect(page.getByText('5 of 7', { exact: true })).toBeVisible()
  })

  test('an unknown step is a first step, not a broken page', async ({ page }) => {
    await page.goto('/tour?step=nonsense')

    await expect(page.getByRole('heading', { level: 1, name: HEADINGS[0] })).toBeVisible()
  })

  /* ------------------------------------------------------------------ Ask */

  test('Ask runs the real pipeline and shows the source it answered from', async ({ page }) => {
    await page.goto('/tour?step=ask')

    await page.getByRole('button', { name: /why can I not sleep at night/ }).click()

    // A named health body, linked, with the date it was checked — not a
    // paraphrase of one.
    const source = page.getByRole('link', { name: /World Health Organization/ })
    await expect(source).toBeVisible()
    await expect(source).toHaveAttribute('href', /^https?:\/\//)
    // The answer's own confidence line, not the classifier note in the trace.
    await expect(page.getByText(/confidence \d\.\d\d · \d+ sources?/)).toBeVisible()
  })

  test('shows its working, including the verifier that ran before the answer', async ({ page }) => {
    await page.goto('/tour?step=ask')

    await page.getByRole('button', { name: /why do I keep getting headaches/ }).click()
    await page.getByText('How it got there').click()

    await expect(page.getByText('Searched the evidence base')).toBeVisible()
    await expect(page.getByText(/invented claims 0\.00/)).toBeVisible()
  })

  test('demonstrates a question it refuses, and says that is deliberate', async ({ page }) => {
    await page.goto('/tour?step=ask')

    await page.getByRole('button', { name: /should I stop taking my antidepressants/ }).click()

    await expect(page.getByText('It declined, on purpose — and still cited why')).toBeVisible()
    await expect(page.getByText(/only your prescriber/i)).toBeVisible()
  })

  /* ------------------------------------------------- the demos save nothing */

  test('nothing anyone does on the tour is written to the device', async ({ page }) => {
    await page.goto('/tour?step=check-in')

    // The input is visually hidden behind its label, so the label is what a
    // person clicks — same approach the check-in screen's own tests take.
    await page
      .getByRole('group', { name: /How is today going/i })
      .getByText('Good', { exact: true })
      .click()
    await expect(page.getByRole('radio', { name: 'Good' })).toBeChecked()
    await expect(page.getByText(/Nothing was saved here/)).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('textbox').fill('Something I would rather not have kept.')
    await expect(page.getByText(/still nowhere/)).toBeVisible()

    expect(await readStore(page, MOODS_KEY)).toBeNull()
    expect(await readStore(page, JOURNAL_KEY)).toBeNull()

    // Only the fact that the tour was offered.
    const stored = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith('mindful.')),
    )
    expect(stored).toEqual([TOUR_SEEN_KEY])
  })

  /* --------------------------------------------------------- how you get in */

  test('the landing page offers it without asking anyone to sign up', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'Have a look around first' }).click()
    await expect(page).toHaveURL(/\/tour/)
    await expect(page.getByRole('heading', { level: 1, name: HEADINGS[0] })).toBeVisible()
  })

  test('is offered once on the first visit home, and then left alone', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/home')

    const invite = page.getByRole('heading', { name: 'Would you like a look around first?' })
    await expect(invite).toBeVisible()

    await page.getByRole('button', { name: 'No thanks' }).click()
    await expect(invite).toBeHidden()

    await page.reload()
    await expect(invite).toBeHidden()

    // Still reachable on purpose, from two places.
    await expect(page.getByRole('link', { name: /Show me around/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tour' })).toBeVisible()
  })

  test('taking the invitation counts as having been offered it', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/home')

    // Exact: the permanent card further down the page is also called this.
    await page.getByRole('link', { name: 'Show me around', exact: true }).click()
    await expect(page).toHaveURL(/\/tour/)

    await page.goto('/home')
    await expect(
      page.getByRole('heading', { name: 'Would you like a look around first?' }),
    ).toBeHidden()
  })

  test('with a profile, the tour keeps the section bar and the way back', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/tour?step=ask')

    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open Ask →' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to your space' })).toBeVisible()
  })

  /* ---------------------------------------------------------- accessibility */

  test('has no WCAG A/AA violations, on the opening step and mid-answer', async ({ page }) => {
    await page.goto('/tour')
    await expectNoA11yViolations(page)

    await page.goto('/tour?step=ask')
    await page.getByRole('button', { name: /why can I not sleep at night/ }).click()
    await settle(page)
    await expectNoA11yViolations(page)

    await page.goto('/tour?step=data')
    await expectNoA11yViolations(page)
  })
})
