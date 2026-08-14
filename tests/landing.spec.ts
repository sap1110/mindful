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

/**
 * The showcase section, which is only worth having if it is genuinely live.
 *
 * Every assertion here drives the real machinery rather than checking that
 * some copy is on the page: the pipeline is run on typed input, the verifier
 * is asked to reject a fabrication, and the browser is asked to refuse a
 * request. If any of it were a mockup, these would pass while the claims were
 * false — so they are written to fail in that case.
 */
test.describe('the showcase runs for real', () => {
  test('the pipeline reacts to what you type, and skips retrieval for an emergency', async ({
    page,
  }) => {
    await page.goto('/')

    const input = page.getByLabel(/Ask it anything/)
    await input.fill('why do I keep getting headaches')
    await expect(page.getByText('Answered, with citations')).toBeVisible()
    await expect(page.getByText(/Searched the evidence base|documents selected/)).toBeVisible()

    // An emergency must escalate — and never reach retrieval at all.
    await input.fill('crushing chest pain spreading to my left arm')
    await expect(page.getByText('Escalated to emergency care')).toBeVisible()
    await expect(page.getByText(/documents selected/)).toHaveCount(0)

    // A vague question is asked back rather than answered.
    await input.fill('is this bad')
    await expect(page.getByText('Asked back')).toBeVisible()
  })

  /**
   * The bug this exists to prevent: the theatre used to render the trace and
   * the verifier's numbers without ever rendering the answer, so typing a real
   * question produced a wall of processing stages and nothing that read as a
   * reply. The stage list is not evidence that anything was answered.
   */
  test('typing a question produces an answer, not just a trace', async ({ page }) => {
    await page.goto('/')

    const input = page.getByLabel(/Ask it anything/)
    const theatre = page.locator('div', { has: page.locator('#theatre-input') }).last()

    await input.fill('why do I keep getting headaches')
    // A cited sentence, attributed — not a stage note.
    await expect(theatre.locator('blockquote').first()).toBeVisible()
    await expect(theatre.locator('blockquote cite').first()).not.toBeEmpty()

    // Escalation replaces the answer with the action, and cites nothing.
    await input.fill('crushing chest pain spreading to my left arm')
    await expect(page.getByText('This could be an emergency')).toBeVisible()
    await expect(theatre.locator('blockquote')).toHaveCount(0)

    // A question asked back must show the actual questions.
    await input.fill('is this bad')
    await expect(page.getByText('A little more detail first')).toBeVisible()
    // The trace is an <ol>; the clarifying questions are the only <ul> here.
    await expect(theatre.locator('ul li').first()).toContainText('?')
  })

  test('the verifier really rejects a fabricated claim', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Try to fabricate' }).click()

    await expect(page.getByText('Rejected before it could reach a screen')).toBeVisible()
    // The reason is the verifier's own, not a canned string.
    await expect(page.getByText(/not present in its cited document/)).toBeVisible()
  })

  test('the browser really refuses to send data to another origin', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Try to exfiltrate' }).click()

    await expect(
      page.getByText('Blocked by the browser, not by our good intentions'),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('has no WCAG A/AA violations with the showcase exercised', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel(/Ask it anything/).fill('why do I keep getting headaches')
    await page.getByRole('button', { name: 'Try to fabricate' }).click()
    await expect(page.getByText('Rejected before it could reach a screen')).toBeVisible()

    await expectNoA11yViolations(page)
  })
})
