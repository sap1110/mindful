import { expect, test, type Page } from '@playwright/test'
import { JOURNAL_KEY, MOODS_KEY, expectNoA11yViolations, seedProfile } from './helpers'

/**
 * Echo, exercised entirely through the keyword engine.
 *
 * Nothing here downloads the model. That is deliberate rather than a shortcut:
 * the fallback path is the one every visitor meets first and the only one some
 * of them will ever have, so it is the path that most needs a regression test.
 * It is also the only one that can run deterministically — embedding search
 * would make these assertions depend on a 30MB artefact and a similarity score.
 */

const TODAY = (() => {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
})()

function daysAgo(count: number): string {
  const date = new Date()
  date.setDate(date.getDate() - count)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * A history with a clear shape: a hard night three weeks ago, followed by
 * check-ins that climb. That is what makes the trajectory line assertable.
 */
async function seedHistory(page: Page): Promise<void> {
  const journal = [
    {
      id: 'j-sleep',
      date: daysAgo(21),
      body: 'Lying awake again with my thoughts racing about work deadlines. I cannot sleep and everything feels enormous at 3am.',
      createdAt: `${daysAgo(21)}T23:40:00.000Z`,
      updatedAt: `${daysAgo(21)}T23:40:00.000Z`,
    },
    {
      id: 'j-garden',
      date: daysAgo(5),
      body: 'Spent the afternoon repotting the plants on the balcony and it was genuinely pleasant. Hands in the soil, nothing else to think about.',
      createdAt: `${daysAgo(5)}T15:00:00.000Z`,
      updatedAt: `${daysAgo(5)}T15:00:00.000Z`,
    },
  ]

  const moods = [
    { id: 'm-1', date: daysAgo(21), score: 2, tags: ['tired'], createdAt: '', updatedAt: '' },
    { id: 'm-2', date: daysAgo(18), score: 3, tags: [], createdAt: '', updatedAt: '' },
    { id: 'm-3', date: daysAgo(14), score: 4, tags: [], createdAt: '', updatedAt: '' },
    { id: 'm-4', date: daysAgo(5), score: 4, tags: ['grateful'], createdAt: '', updatedAt: '' },
    { id: 'm-5', date: TODAY, score: 3, tags: [], createdAt: '', updatedAt: '' },
  ].map((entry) => ({
    ...entry,
    createdAt: `${entry.date}T20:00:00.000Z`,
    updatedAt: `${entry.date}T20:00:00.000Z`,
  }))

  await page.addInitScript(
    ([journalKey, journalValue, moodsKey, moodsValue]) => {
      window.localStorage.setItem(journalKey, journalValue)
      window.localStorage.setItem(moodsKey, moodsValue)
    },
    [JOURNAL_KEY, JSON.stringify(journal), MOODS_KEY, JSON.stringify(moods)] as const,
  )
}

const ask = async (page: Page, text: string) => {
  await page.getByLabel(/How are things right now/i).fill(text)
  // Exact: "Download it and look back" would otherwise match too.
  await page.getByRole('button', { name: 'Look back', exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
})

test.describe('echo', () => {
  test('works before anything is downloaded, and offers the upgrade', async ({ page }) => {
    await page.goto('/echo')

    await expect(page.getByRole('heading', { name: 'Have you been here before?' })).toBeVisible()

    // The search box is usable immediately — the download is not a gate.
    await expect(page.getByLabel(/How are things right now/i)).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Make Echo match meaning, not just words' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /Download it and look back/i })).toBeVisible()
  })

  test('states the download size and that nothing is uploaded', async ({ page }) => {
    await page.goto('/echo')

    await expect(page.getByText(/around 30MB in total/i)).toBeVisible()
    await expect(page.getByText(/Nothing goes up\./)).toBeVisible()
    await expect(page.getByText(/never sent anywhere\. There is no server/i)).toBeVisible()
  })

  test('finds an earlier entry and reports what followed it', async ({ page }) => {
    await seedHistory(page)
    await page.goto('/echo')

    await expect(page.getByText('2 of your own entries are searchable.')).toBeVisible()

    await ask(page, 'I cannot sleep and my thoughts keep racing about work')

    // The person's own words, verbatim.
    await expect(page.getByText(/Lying awake again with my thoughts racing/)).toBeVisible()

    // The trajectory, which is the therapeutic payload.
    await expect(page.getByText(/In the two weeks after that/)).toBeVisible()

    // And the app is honest that this was a word match, not a meaning match.
    await expect(page.getByText(/Matched on the words you used, not their meaning/)).toBeVisible()
  })

  test('does not invent a match when nothing is close', async ({ page }) => {
    await seedHistory(page)
    await page.goto('/echo')

    await ask(page, 'wondering whether to repaint the kitchen cupboards')

    await expect(page.getByText(/Nothing you have written so far reads much like this/)).toBeVisible()
    await expect(page.getByText(/Lying awake again/)).toBeHidden()
  })

  test('a risk disclosure replaces the results with crisis support', async ({ page }) => {
    await seedHistory(page)
    await page.goto('/echo')

    await ask(page, 'I do not want to be here anymore')

    await expect(
      page.getByRole('heading', { name: /That sounds like more than a look back can help with/ }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Please talk to someone' })).toBeVisible()
    await expect(page.getByRole('link', { name: /988 Suicide & Crisis Lifeline/ })).toBeVisible()

    // Crucially, the search results are not shown alongside it.
    await expect(page.getByText(/Lying awake again/)).toBeHidden()
    await expect(page.getByText(/of your own entries/)).toBeVisible()
  })

  test('the crisis path does not depend on the model having loaded', async ({ page }) => {
    // No history, no download, nothing warmed up — the safety path still fires.
    await page.goto('/echo')
    await ask(page, 'I have been thinking about killing myself')

    await expect(page.getByRole('heading', { name: 'Please talk to someone' })).toBeVisible()
    await expect(page.getByText(/call your local emergency number/)).toBeVisible()
  })

  test('falls back to published guidance when there is no history', async ({ page }) => {
    await page.goto('/echo')

    await expect(
      page.getByText(/Nothing of your own to search yet/),
    ).toBeVisible()

    await ask(page, 'I cannot sleep and I keep waking up in the night')

    await expect(page.getByRole('heading', { name: 'From published guidance' })).toBeVisible()
    await expect(page.getByText(/Mindful does not give health advice of its own/)).toBeVisible()

    // Attribution is present and links out.
    await expect(page.getByRole('link', { name: /World Health Organization/ }).first()).toBeVisible()
  })

  test('has no WCAG A/AA violations, empty and with results', async ({ page }) => {
    await seedHistory(page)
    await page.goto('/echo')
    await expectNoA11yViolations(page)

    await ask(page, 'I cannot sleep and my thoughts keep racing about work')
    await expect(page.getByText(/Lying awake again/)).toBeVisible()
    await expectNoA11yViolations(page)

    // The crisis surface has its own colours and needs its own pass.
    await page.getByRole('button', { name: 'Clear' }).click()
    await ask(page, 'I do not want to be here anymore')
    await expect(page.getByRole('heading', { name: 'Please talk to someone' })).toBeVisible()
    await expectNoA11yViolations(page)
  })
})
