import { expect, test } from '@playwright/test'
import { JOURNAL_KEY, expectNoA11yViolations, readStore, seedProfile } from './helpers'

interface StoredEntry {
  id: string
  body: string
  prompt?: string
}

const DRAFT_KEY = 'mindful.v1.journal.draft'

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
})

test.describe('journal', () => {
  test('offers a prompt that can be used or sent away', async ({ page }) => {
    await page.goto('/journal')

    const prompt = page.getByRole('heading', { name: /Today’s prompt/ })
    await expect(prompt).toBeVisible()

    await page.getByRole('button', { name: /Start with this prompt/i }).click()
    await expect(page.getByText(/Answering today’s prompt/)).toBeVisible()

    await page.getByRole('button', { name: /Dismiss today’s prompt/ }).click()
    await expect(prompt).toHaveCount(0)

    // Dismissal is remembered for the rest of the day.
    await page.reload()
    await expect(page.getByRole('heading', { name: /Today’s prompt/ })).toHaveCount(0)
  })

  test('autosaves a draft and restores it after a reload', async ({ page }) => {
    await page.goto('/journal')
    await page.getByLabel('Your entry').fill('Half a thought, unfinished.')

    await expect(page.getByText('Draft saved on this device.')).toBeVisible()
    const draft = await readStore<{ body: string }>(page, DRAFT_KEY)
    expect(draft?.body).toBe('Half a thought, unfinished.')

    await page.reload()
    await expect(page.getByLabel('Your entry')).toHaveValue('Half a thought, unfinished.')
  })

  test('saves an entry, clears the composer and lists it', async ({ page }) => {
    await page.goto('/journal')
    await page.getByLabel('Your entry').fill('Wrote a little, felt better for it.')
    await page.getByRole('button', { name: 'Save entry' }).click()

    await expect(page.getByRole('status')).toContainText('Entry saved')
    await expect(page.getByLabel('Your entry')).toHaveValue('')

    const stored = await readStore<StoredEntry[]>(page, JOURNAL_KEY)
    expect(stored).toHaveLength(1)
    expect(stored?.[0].body).toBe('Wrote a little, felt better for it.')
    expect(await readStore(page, DRAFT_KEY)).toBeNull()

    await expect(page.getByText('Wrote a little, felt better for it.')).toBeVisible()
    await expect(page.getByText('1 entry · private to this device')).toBeVisible()
  })

  test('refuses to save an empty entry', async ({ page }) => {
    await page.goto('/journal')
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('status')).toContainText('Write something first')
    expect(await readStore(page, JOURNAL_KEY)).toBeNull()
  })

  test('an entry can be expanded and edited in place', async ({ page }) => {
    await page.goto('/journal')
    await page.getByLabel('Your entry').fill('First version.')
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('status')).toContainText('Entry saved')

    const expand = page.getByRole('button', { name: /Read in full/ })
    await expect(expand).toHaveAttribute('aria-expanded', 'false')
    await expand.click()
    await expect(page.getByRole('button', { name: /Show less/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await page.getByRole('button', { name: /^Edit/ }).click()
    await page.getByLabel('Edit this entry').fill('Second version, thought about it more.')
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByRole('status')).toContainText('Entry updated')
    await expect(page.getByText('Second version, thought about it more.')).toBeVisible()

    const stored = await readStore<StoredEntry[]>(page, JOURNAL_KEY)
    expect(stored?.[0].body).toBe('Second version, thought about it more.')
  })

  test('deleting an entry takes a confirmation', async ({ page }) => {
    await page.goto('/journal')
    await page.getByLabel('Your entry').fill('Something to throw away.')
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('status')).toContainText('Entry saved')

    await page.getByRole('button', { name: /^Delete/ }).click()
    await expect(page.getByText(/Delete this entry\?/)).toBeVisible()

    // Backing out leaves it alone…
    await page.getByRole('button', { name: 'Keep it' }).click()
    expect(await readStore<StoredEntry[]>(page, JOURNAL_KEY)).toHaveLength(1)

    // …and confirming removes it.
    await page.getByRole('button', { name: /^Delete/ }).click()
    await page.getByRole('button', { name: 'Yes, delete it' }).click()
    await expect(page.getByRole('status')).toContainText('Entry deleted')
    expect(await readStore<StoredEntry[]>(page, JOURNAL_KEY)).toEqual([])
  })

  test('has no WCAG A/AA violations, empty or filled', async ({ page }) => {
    await page.goto('/journal')
    await expectNoA11yViolations(page)

    await page.getByLabel('Your entry').fill('An entry to audit against.')
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('status')).toContainText('Entry saved')
    await expectNoA11yViolations(page)
  })
})
