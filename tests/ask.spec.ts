import { expect, test, type Page } from '@playwright/test'
import { expectNoA11yViolations, seedProfile } from './helpers'

/**
 * Ask, driven the way a person drives it. The pipeline's logic is proven in
 * `guide-pipeline.spec.ts`; this suite proves the screen tells the truth about
 * it — the safe-response sections render, sources are real links, escalations
 * replace education rather than decorating it, and the whole thing is
 * accessible in every state.
 */

async function ask(page: Page, question: string): Promise<void> {
  await page.getByLabel('Your question').fill(question)
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
})

test.describe('ask', () => {
  test('answers a normal question in the safe-response format, with sources', async ({ page }) => {
    await page.goto('/ask')

    await ask(page, 'I keep getting headaches after long days at work, what could help?')

    // The PRD sections, all present.
    await expect(page.getByRole('heading', { name: 'What the evidence says' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'What is uncertain' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'What to do next' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'When to seek professional help' })).toBeVisible()

    // A real citation: named org, real link, retrieval date.
    const sourceLink = page.getByRole('link', { name: /NHS — Headaches/ }).first()
    await expect(sourceLink).toBeVisible()
    await expect(sourceLink).toHaveAttribute('href', /nhs\.uk/)
    await expect(page.getByText(/checked 2026-08-14/).first()).toBeVisible()

    // Uncertainty is stated, not implied.
    await expect(page.getByText(/not an assessment of you/).first()).toBeVisible()

    // The verifier's verdict is on the page, with the invariant visible.
    await expect(page.getByText(/invented claims 0\.00/)).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'How this answer was put together' }),
    ).toBeVisible()
  })

  test('an emergency replaces education entirely', async ({ page }) => {
    await page.goto('/ask')

    await ask(page, 'I have crushing chest pain spreading to my left arm')

    await expect(page.getByRole('heading', { name: 'This could be an emergency' })).toBeVisible()
    await expect(page.getByText(/Do not drive yourself/)).toBeVisible()

    // No evidence cards, no next steps — nothing that reads as "but first".
    await expect(page.getByRole('heading', { name: 'What the evidence says' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'What to do next' })).toHaveCount(0)
  })

  test('a crisis disclosure routes to crisis support', async ({ page }) => {
    await page.goto('/ask')

    await ask(page, 'I dont want to be here anymore')

    await expect(
      page.getByRole('heading', { name: /more than a look back can help with/ }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Please talk to someone' })).toBeVisible()
    await expect(page.getByRole('link', { name: /988 Suicide & Crisis Lifeline/ })).toBeVisible()
  })

  test('a vague question is asked back, not guessed at', async ({ page }) => {
    await page.goto('/ask')

    await ask(page, 'it hurts')

    await expect(page.getByRole('heading', { name: 'A little more detail first' })).toBeVisible()
    await expect(page.getByText(/How long has this been going on/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'What the evidence says' })).toHaveCount(0)
  })

  test('diagnosis requests are declined with a route, not answered', async ({ page }) => {
    await page.goto('/ask')

    await ask(page, 'diagnose me: do I have diabetes')

    await expect(
      page.getByRole('heading', { name: 'That needs a professional, not an app' }),
    ).toBeVisible()
    await expect(page.getByText(/cannot say what condition someone has/)).toBeVisible()
  })

  test('medication questions land in the medication lane, evidence-backed', async ({ page }) => {
    await page.goto('/ask')

    await ask(page, 'can I take ibuprofen and paracetamol together?')

    await expect(page.getByText(/does not answer questions about doses/)).toBeVisible()
    await expect(page.getByRole('link', { name: /MedlinePlus/ }).first()).toBeVisible()
    await expect(page.getByText(/pharmacist/i).first()).toBeVisible()
  })

  test('has no WCAG A/AA violations, empty, answered and escalated', async ({ page }) => {
    await page.goto('/ask')
    await expectNoA11yViolations(page)

    await ask(page, 'how much water should I drink a day')
    await expectNoA11yViolations(page)

    await ask(page, 'worst headache of my life, came on suddenly')
    await expectNoA11yViolations(page)
  })
})
