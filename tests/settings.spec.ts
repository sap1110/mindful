import { expect, test } from '@playwright/test'
import {
  MOODS_KEY,
  PROFILE_KEY,
  expectNoA11yViolations,
  readStore,
  seedProfile,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
})

test.describe('settings', () => {
  test('states the privacy promise and what is stored', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Your data' })).toBeVisible()
    await expect(page.getByText(/no account and no server/i)).toBeVisible()
    await expect(page.getByText('Nothing stored yet.')).toBeVisible()
  })

  test('exports everything as a JSON file', async ({ page }) => {
    await page.goto('/settings')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export my data' }).click(),
    ])

    expect(download.suggestedFilename()).toMatch(/^mindful-export-\d{4}-\d{2}-\d{2}\.json$/)
    await expect(page.getByRole('status')).toContainText('Export downloaded')
  })

  test('loads sample data, labels it, and takes it away again', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Load sample data' }).click()

    await expect(page.getByRole('status')).toContainText('Sample data loaded')
    await expect(page.getByRole('button', { name: 'Remove sample data' })).toBeVisible()

    const moods = await readStore<unknown[]>(page, MOODS_KEY)
    expect((moods ?? []).length).toBeGreaterThan(10)

    // The samples say what they are wherever they show up.
    await page.goto('/mood')
    await expect(page.getByText('Sample').first()).toBeVisible()

    await page.goto('/settings')
    await page.getByRole('button', { name: 'Remove sample data' }).click()
    await expect(page.getByRole('status')).toContainText('Sample data removed')
    expect(await readStore<unknown[]>(page, MOODS_KEY)).toEqual([])
  })

  test('erasing everything takes a confirmation and then clears the device', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Load sample data' }).click()
    await expect(page.getByRole('status')).toContainText('Sample data loaded')

    await page.getByRole('button', { name: 'Erase all data' }).click()
    await expect(page.getByText(/Erase all \d+ records and your profile\?/)).toBeVisible()

    // Backing out changes nothing.
    await page.getByRole('button', { name: 'Keep my data' }).click()
    expect(await readStore<unknown[]>(page, MOODS_KEY)).not.toBeNull()

    await page.getByRole('button', { name: 'Erase all data' }).click()
    await page.getByRole('button', { name: 'Yes, erase everything' }).click()

    // With nothing left on the device, the gate treats you as a new visitor.
    await expect(page).toHaveURL(/\/onboarding$/)
    const remaining = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith('mindful.')),
    )
    expect(remaining).toEqual([])
    expect(await readStore(page, PROFILE_KEY)).toBeNull()
  })

  test('has no WCAG A/AA violations, empty or filled', async ({ page }) => {
    await page.goto('/settings')
    await expectNoA11yViolations(page)

    await page.getByRole('button', { name: 'Load sample data' }).click()
    await expect(page.getByRole('status')).toContainText('Sample data loaded')
    await expectNoA11yViolations(page)
  })
})
