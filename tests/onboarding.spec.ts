import { expect, test } from '@playwright/test'
import { PROFILE_KEY, expectNoA11yViolations, readStore, seedProfile } from './helpers'

interface StoredProfile {
  name: string
  reasons: string[]
  copingStyle: string
}

test.describe('the gate', () => {
  test('sends someone without a profile to onboarding', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/onboarding$/)
  })

  test('lets a returning visitor into /home', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/home')
    await expect(page.getByRole('heading', { name: /Hello, Sam/i })).toBeVisible()
  })

  test('skips onboarding once it has been completed', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/home$/)
  })
})

test.describe('onboarding', () => {
  test('walks the three steps and stores the profile on device', async ({ page }) => {
    await page.goto('/onboarding')

    // Step 1 — name.
    await page.getByLabel(/Your name/i).fill('Sam')
    await expectNoA11yViolations(page)
    await page.getByRole('button', { name: /Continue/i }).click()

    // Step 2 — reasons, as real checkboxes behind the tiles.
    await expect(page.getByRole('heading', { name: /What has been on your mind/i })).toBeVisible()
    await page.getByText('Anxious thoughts', { exact: true }).click()
    await page.getByText('Rest and sleep', { exact: true }).click()
    await expect(page.getByRole('checkbox', { name: /Anxious thoughts/i })).toBeChecked()
    await expectNoA11yViolations(page)
    await page.getByRole('button', { name: /Continue/i }).click()

    // Step 3 — one coping style, and it refuses to finish without one.
    await expect(page.getByRole('heading', { name: /When things get heavy/i })).toBeVisible()
    await page.getByRole('button', { name: /Finish/i }).click()
    await expect(page.getByText(/Choose the one that feels closest/i)).toBeVisible()

    await page.getByText('Grounding', { exact: true }).click()
    await expect(page.getByRole('radio', { name: /Grounding/i })).toBeChecked()
    await expectNoA11yViolations(page)
    await page.getByRole('button', { name: /Finish/i }).click()

    // Completion.
    await expect(page.getByRole('heading', { name: /You.re all set, Sam/i })).toBeVisible()
    await expect(page.getByText(/find a crisis helpline/i)).toBeVisible()
    await expectNoA11yViolations(page)

    const profile = await readStore<StoredProfile>(page, PROFILE_KEY)
    expect(profile?.name).toBe('Sam')
    expect(profile?.copingStyle).toBe('grounding')
    expect(profile?.reasons).toEqual(['anxiety', 'sleep'])

    await page.getByRole('link', { name: /Go to your space/i }).click()
    await expect(page).toHaveURL(/\/home$/)
  })
})
