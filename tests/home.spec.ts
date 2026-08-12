import { expect, test } from '@playwright/test'
import { collectConsoleErrors, expectNoA11yViolations, seedProfile } from './helpers'

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
})

test.describe('home', () => {
  test('greets by name and links to every section', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/home')

    await expect(page.getByRole('heading', { name: /Hello, Sam/i })).toBeVisible()
    for (const label of ['Daily check-in', 'Journal', 'Breathe', 'Your data']) {
      await expect(page.getByRole('link', { name: new RegExp(label, 'i') }).first()).toBeVisible()
    }
    expect(errors).toEqual([])
  })

  test('has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/home')
    await expectNoA11yViolations(page)
  })

  test('the section bar marks the page you are on and moves between screens', async ({ page }) => {
    await page.goto('/home')
    const nav = page.getByRole('navigation', { name: 'Sections' })

    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')

    await nav.getByRole('link', { name: 'Mood' }).click()
    await expect(page).toHaveURL(/\/mood$/)
    await expect(nav.getByRole('link', { name: 'Mood' })).toHaveAttribute('aria-current', 'page')

    await nav.getByRole('link', { name: 'Breathe' }).click()
    await expect(page).toHaveURL(/\/breathe$/)
  })
})

test.describe('home on a small phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('fits 375px and keeps the section bar reachable', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
