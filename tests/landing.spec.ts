import { expect, test } from '@playwright/test'
import { collectConsoleErrors, expectNoA11yViolations } from './helpers'

test.describe('landing', () => {
  test('renders the hero, the disclaimer and a skip link', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/')

    await expect(page.locator('h1').first()).toContainText('quieter place')
    await expect(page.getByText('Not medical advice').first()).toBeVisible()
    await expect(page.locator('a.skip-link')).toHaveCount(1)
    expect(errors).toEqual([])
  })

  test('has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/')
    await expectNoA11yViolations(page)
  })
})

test.describe('landing on a small phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('fits 375px without horizontal overflow', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
