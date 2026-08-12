import { expect, test, type Page } from '@playwright/test'
import { MOODS_KEY, expectNoA11yViolations, readStore, seedProfile, todayISO } from './helpers'

interface StoredMood {
  date: string
  score: number
  tags: string[]
  note?: string
}

/** "Low" is both a face and a tag, so both are addressed through their group. */
const face = (page: Page, label: string) =>
  page.getByRole('group', { name: /How today feels/i }).getByText(label, { exact: true })

const tag = (page: Page, label: string) =>
  page.getByRole('group', { name: /Anything else going on/i }).getByText(label, { exact: true })

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
})

test.describe('mood check-in', () => {
  test('shows a warm empty state before the first check-in', async ({ page }) => {
    await page.goto('/mood')
    await expect(page.getByRole('heading', { name: 'How are you today?' })).toBeVisible()
    await expect(page.getByText(/no streak to keep and no day that counts as missed/i)).toBeVisible()
  })

  test('records a check-in with a tag and a note', async ({ page }) => {
    await page.goto('/mood')

    await face(page, 'Okay').click()
    await expect(page.getByRole('radio', { name: 'Okay' })).toBeChecked()

    await tag(page, 'Tired').click()
    await page.getByLabel(/A note to yourself/i).fill('Long day, but it is over.')
    await page.getByRole('button', { name: /Save today's check-in/i }).click()

    await expect(page.getByRole('status')).toContainText('Check-in saved')

    const stored = await readStore<StoredMood[]>(page, MOODS_KEY)
    expect(stored).toHaveLength(1)
    expect(stored?.[0].date).toBe(todayISO())
    expect(stored?.[0].score).toBe(3)
    expect(stored?.[0].tags).toEqual(['tired'])
    expect(stored?.[0].note).toBe('Long day, but it is over.')

    // And it appears in the history, described in words rather than colour.
    await expect(page.getByText('One check-in so far.')).toBeVisible()
    await expect(page.getByRole('list', { name: /last 30 days/i })).toBeVisible()
    await expect(page.getByText('· 3 of 5')).toBeVisible()
  })

  test('reopens today in edit mode and keeps it to one entry a day', async ({ page }) => {
    await page.goto('/mood')
    await face(page, 'Low').click()
    await page.getByRole('button', { name: /Save today's check-in/i }).click()
    await expect(page.getByRole('status')).toContainText('Check-in saved')

    await page.reload()

    await expect(page.getByText(/Updating today’s check-in/)).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Low' })).toBeChecked()

    await face(page, 'Great').click()
    await page.getByRole('button', { name: /Update today's check-in/i }).click()
    await expect(page.getByRole('status')).toContainText('updated')

    const stored = await readStore<StoredMood[]>(page, MOODS_KEY)
    expect(stored).toHaveLength(1)
    expect(stored?.[0].score).toBe(5)
  })

  test('asks for a score before saving', async ({ page }) => {
    await page.goto('/mood')
    await page.getByRole('button', { name: /Save today's check-in/i }).click()
    await expect(page.getByRole('alert')).toContainText('Choose how today feels first')
    expect(await readStore<StoredMood[]>(page, MOODS_KEY)).toBeNull()
  })

  test('the scale works from the keyboard alone', async ({ page }) => {
    await page.goto('/mood')

    // Space selects the focused face…
    await page.getByRole('radio', { name: 'Rough' }).focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('radio', { name: 'Rough' })).toBeChecked()

    // …and the arrow keys move along the scale.
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Low' })).toBeChecked()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Okay' })).toBeChecked()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('radio', { name: 'Low' })).toBeChecked()
  })

  test('a check-in can be removed again', async ({ page }) => {
    await page.goto('/mood')
    await face(page, 'Good').click()
    await page.getByRole('button', { name: /Save today's check-in/i }).click()
    await page.getByRole('button', { name: /Remove today’s check-in/ }).click()

    await expect(page.getByRole('status')).toContainText('was removed')
    expect(await readStore<StoredMood[]>(page, MOODS_KEY)).toEqual([])
  })

  test('has no WCAG A/AA violations, empty or filled', async ({ page }) => {
    await page.goto('/mood')
    await expectNoA11yViolations(page)

    await face(page, 'Good').click()
    await tag(page, 'Grateful').click()
    await page.getByRole('button', { name: /Save today's check-in/i }).click()
    await expect(page.getByRole('status')).toContainText('Check-in saved')
    await expectNoA11yViolations(page)
  })
})
