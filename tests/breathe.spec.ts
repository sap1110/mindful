import { expect, test } from '@playwright/test'
import { BREATHING_KEY, expectNoA11yViolations, readStore, seedProfile } from './helpers'

interface StoredSession {
  patternId: string
  completedCycles: number
  durationMs: number
}

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
})

test.describe('breathing', () => {
  test('offers three rhythms and three lengths', async ({ page }) => {
    await page.goto('/breathe')
    await expect(page.getByRole('heading', { name: 'Breathe', exact: true })).toBeVisible()

    for (const name of ['Box', 'Calming', 'Relaxed']) {
      await expect(page.getByRole('radio', { name: new RegExp(name) })).toHaveCount(1)
    }
    for (const label of ['1 min', '3 min', '5 min']) {
      await expect(page.getByRole('radio', { name: label })).toHaveCount(1)
    }
    await expect(page.getByText('No sound, no streaks here.')).toBeVisible()
  })

  test('paces a session in text as well as in motion', async ({ page }) => {
    await page.goto('/breathe')
    await expect(page.getByText(/Round 1 of \d+/)).toBeVisible()

    await page.getByRole('button', { name: 'Begin' }).click()

    const phase = page.locator('p > span[aria-live="polite"]').first()
    await expect(phase).toHaveText('Breathe in')
    await expect(page.getByText(/left in this step/)).toBeVisible()

    // Box is 4-4-4-4, so the next instruction is due four seconds in.
    await expect(phase).toHaveText('Hold', { timeout: 9_000 })
  })

  test('pauses and resumes', async ({ page }) => {
    await page.goto('/breathe')
    await page.getByRole('button', { name: 'Begin' }).click()
    await page.getByRole('button', { name: 'Pause' }).click()

    const phase = page.locator('p > span[aria-live="polite"]').first()
    await expect(phase).toHaveText('Paused')

    await page.getByRole('button', { name: 'Resume' }).click()
    await expect(phase).toHaveText(/Breathe in|Hold|Breathe out|Rest/)
  })

  test('records the session when you stop early', async ({ page }) => {
    await page.goto('/breathe')
    await page.getByText('Relaxed', { exact: true }).click()
    await expect(page.getByRole('radio', { name: /Relaxed/ })).toBeChecked()
    await page.getByRole('button', { name: 'Begin' }).click()
    await page.waitForTimeout(1_200)
    await page.getByRole('button', { name: 'Stop' }).click()

    await expect(page.getByRole('status')).toContainText('Session recorded')

    const stored = await readStore<StoredSession[]>(page, BREATHING_KEY)
    expect(stored).toHaveLength(1)
    expect(stored?.[0].patternId).toBe('relaxed')
    expect(stored?.[0].durationMs).toBeGreaterThan(0)

    const recent = page.getByRole('region', { name: 'Recent sessions' })
    await expect(recent.getByText(/Relaxed ·/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start another' })).toBeVisible()
  })

  test('has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/breathe')
    await expectNoA11yViolations(page)
  })
})

test.describe('breathing with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('replaces the animation with a text guide that still paces', async ({ page }) => {
    await page.goto('/breathe')

    await expect(page.getByText(/Motion is turned down on this device/)).toBeVisible()
    await expect(page.getByText('Ready when you are')).toBeVisible()

    // The whole rhythm is written out as steps, not just the current one.
    const steps = page.getByRole('listitem').filter({ hasText: /Breathe in|Hold|Breathe out|Rest/ })
    await expect(steps.first()).toBeVisible()

    await page.getByRole('button', { name: 'Begin' }).click()
    const phase = page.locator('p[aria-live="polite"]').first()
    await expect(phase).toHaveText('Breathe in')
    await expect(phase).toHaveText('Hold', { timeout: 9_000 })
  })

  test('has no WCAG A/AA violations with the text guide', async ({ page }) => {
    await page.goto('/breathe')
    await expectNoA11yViolations(page)
  })
})
