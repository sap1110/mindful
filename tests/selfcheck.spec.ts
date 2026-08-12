import { expect, test, type Page } from '@playwright/test'
import {
  SCREENERS_KEY,
  expectNoA11yViolations,
  readStore,
  seedProfile,
  todayISO,
} from './helpers'

interface StoredScreener {
  screenerId: string
  date: string
  score: number
  bandId: string
  answers: Record<string, number>
  riskFlagged: boolean
}

const PHQ9_ITEMS = 9
const GAD7_ITEMS = 7

/**
 * One frequency option on one item.
 *
 * Addressed through the item's own `<fieldset>`, because "Not at all" appears
 * nine times on a PHQ-9 and only the surrounding group tells them apart.
 */
const option = (page: Page, position: number, total: number, label: string) =>
  page
    .getByRole('group', { name: new RegExp(`Question ${position} of ${total}`) })
    .getByText(label, { exact: true })

/**
 * Fill a PHQ-9, answering item 9 — the self-harm item — separately from the
 * rest. Keeping the two apart is the point of most of these tests: the risk
 * item has to be able to move on its own while the total stays low.
 */
async function fillPhq9(page: Page, rest: string, riskItem: string): Promise<void> {
  for (let position = 1; position < PHQ9_ITEMS; position += 1) {
    await option(page, position, PHQ9_ITEMS, rest).click()
  }
  await option(page, PHQ9_ITEMS, PHQ9_ITEMS, riskItem).click()
}

/** Headings in the order they appear in the document, to assert on layout order. */
async function headingOrder(page: Page): Promise<string[]> {
  return page.locator('h1, h2').allInnerTexts()
}

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
})

test.describe('self-check', () => {
  test('offers both instruments and attributes them', async ({ page }) => {
    await page.goto('/self-check')

    await expect(page.getByRole('heading', { name: 'Where are things, really?' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'PHQ-9', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'GAD-7', exact: true })).toBeVisible()

    // The instruments are cited, which the hackathon rules require and the
    // authors are owed.
    await expect(page.getByText(/Kroenke K, Spitzer RL/)).toBeVisible()
    await expect(page.getByText(/Löwe B/)).toBeVisible()
    await expect(page.getByText(/No permission is required/).first()).toBeVisible()

    // Crisis routing is present before anyone has scored anything at all.
    await expect(
      page.getByRole('heading', { name: 'If you need to talk to someone now' }),
    ).toBeVisible()
  })

  test('scores a finished PHQ-9 and keeps it on the device', async ({ page }) => {
    await page.goto('/self-check')
    await page.getByRole('button', { name: 'Start the PHQ-9' }).click()

    await expect(page.getByText('0 of 9 answered')).toBeVisible()

    // Eight items at "Several days", the risk item at "Not at all" — 8 points.
    await fillPhq9(page, 'Several days', 'Not at all')
    await expect(page.getByText('9 of 9 answered')).toBeVisible()

    await page.getByRole('button', { name: 'See what this comes to' }).click()

    await expect(page.getByRole('heading', { name: 'Mild range' })).toBeVisible()
    await expect(page.getByText('8 of 27')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'This is a questionnaire, not a diagnosis' }),
    ).toBeVisible()

    const stored = await readStore<StoredScreener[]>(page, SCREENERS_KEY)
    expect(stored).toHaveLength(1)
    expect(stored?.[0].screenerId).toBe('phq9')
    expect(stored?.[0].date).toBe(todayISO())
    expect(stored?.[0].score).toBe(8)
    expect(stored?.[0].bandId).toBe('mild')
    expect(stored?.[0].riskFlagged).toBe(false)
    expect(stored?.[0].answers['phq9-9']).toBe(0)
  })

  test('scores a GAD-7 too', async ({ page }) => {
    await page.goto('/self-check')
    await page.getByRole('button', { name: 'Start the GAD-7' }).click()

    for (let position = 1; position <= GAD7_ITEMS; position += 1) {
      await option(page, position, GAD7_ITEMS, 'Nearly every day').click()
    }
    await page.getByRole('button', { name: 'See what this comes to' }).click()

    await expect(page.getByRole('heading', { name: 'Severe range' })).toBeVisible()
    await expect(page.getByText('21 of 21')).toBeVisible()

    const stored = await readStore<StoredScreener[]>(page, SCREENERS_KEY)
    expect(stored?.[0].screenerId).toBe('gad7')
    expect(stored?.[0].score).toBe(21)
  })

  test('will not score a half-finished form', async ({ page }) => {
    await page.goto('/self-check')
    await page.getByRole('button', { name: 'Start the PHQ-9' }).click()

    await option(page, 1, PHQ9_ITEMS, 'Several days').click()
    await page.getByRole('button', { name: 'See what this comes to' }).click()

    await expect(page.getByRole('alert')).toContainText('8 questions are still to answer')
    // A total built from skipped items understates the score, so nothing is kept.
    expect(await readStore<StoredScreener[]>(page, SCREENERS_KEY)).toBeNull()
  })

  test('leads with crisis support when the risk item is answered, even on a low score', async ({
    page,
  }) => {
    await page.goto('/self-check')
    await page.getByRole('button', { name: 'Start the PHQ-9' }).click()

    // Everything at "Not at all" except the self-harm item: one single point.
    await fillPhq9(page, 'Not at all', 'Several days')
    await page.getByRole('button', { name: 'See what this comes to' }).click()

    await expect(page.getByRole('heading', { name: 'Please talk to someone' })).toBeVisible()
    await expect(page.getByRole('link', { name: /988 Suicide & Crisis Lifeline/ })).toBeVisible()
    await expect(page.getByText(/call your local emergency number/)).toBeVisible()

    // The score is genuinely minimal, and the crisis block still comes first —
    // nobody should have to scroll past a reassuring number to reach a helpline.
    const headings = await headingOrder(page)
    const crisis = headings.findIndex((text) => text.includes('Please talk to someone'))
    const score = headings.findIndex((text) => text.includes('Minimal range'))
    expect(crisis).toBeGreaterThanOrEqual(0)
    expect(score).toBeGreaterThan(crisis)

    const stored = await readStore<StoredScreener[]>(page, SCREENERS_KEY)
    expect(stored?.[0].score).toBe(1)
    expect(stored?.[0].bandId).toBe('minimal')
    expect(stored?.[0].riskFlagged).toBe(true)
  })

  test('an abandoned form leaves no trace', async ({ page }) => {
    await page.goto('/self-check')
    await page.getByRole('button', { name: 'Start the PHQ-9' }).click()

    await option(page, 1, PHQ9_ITEMS, 'Nearly every day').click()
    await page.getByRole('button', { name: 'Leave this for now' }).click()

    await expect(page.getByRole('heading', { name: 'Where are things, really?' })).toBeVisible()
    expect(await readStore<StoredScreener[]>(page, SCREENERS_KEY)).toBeNull()

    // Starting again begins blank rather than resurrecting the abandoned answer.
    await page.getByRole('button', { name: 'Start the PHQ-9' }).click()
    await expect(page.getByText('0 of 9 answered')).toBeVisible()
  })

  test('a finished check shows up in the history and suggests waiting to retake', async ({
    page,
  }) => {
    await page.goto('/self-check')
    await page.getByRole('button', { name: 'Start the PHQ-9' }).click()
    await fillPhq9(page, 'Several days', 'Not at all')
    await page.getByRole('button', { name: 'See what this comes to' }).click()
    await expect(page.getByRole('heading', { name: 'Mild range' })).toBeVisible()

    await page.getByRole('button', { name: 'Back to the self-checks' }).click()

    await expect(page.getByRole('heading', { name: 'Your results so far' })).toBeVisible()
    await expect(page.getByText('· 8 of 27')).toBeVisible()

    // Both instruments ask about the last fortnight, so a same-day retake is
    // gently discouraged — and still permitted.
    await expect(page.getByText(/You took this recently/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Take the PHQ-9 anyway' })).toBeVisible()
  })

  test('has no WCAG A/AA violations across every stage', async ({ page }) => {
    await page.goto('/self-check')
    await expectNoA11yViolations(page)

    await page.getByRole('button', { name: 'Start the PHQ-9' }).click()
    await expectNoA11yViolations(page)

    // The unanswered-items error state.
    await page.getByRole('button', { name: 'See what this comes to' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expectNoA11yViolations(page)

    // An ordinary result…
    await fillPhq9(page, 'Several days', 'Not at all')
    await page.getByRole('button', { name: 'See what this comes to' }).click()
    await expect(page.getByRole('heading', { name: 'Mild range' })).toBeVisible()
    await expectNoA11yViolations(page)

    // …and the urgent one, whose colours and crisis links differ.
    await page.getByRole('button', { name: 'Take it again' }).click()
    await fillPhq9(page, 'Nearly every day', 'Nearly every day')
    await page.getByRole('button', { name: 'See what this comes to' }).click()
    await expect(page.getByRole('heading', { name: 'Please talk to someone' })).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('the history renders sample results without passing them off as real', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Load sample data' }).click()
    await expect(page.getByRole('status')).toContainText('Sample data loaded')

    await page.goto('/self-check')
    await expect(page.getByRole('heading', { name: 'Your results so far' })).toBeVisible()
    await expect(page.getByText('Sample').first()).toBeVisible()
    await expectNoA11yViolations(page)
  })
})
