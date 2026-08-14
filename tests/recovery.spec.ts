import { expect, test, type Page } from '@playwright/test'
import { expectNoA11yViolations, readStore, seedProfile, todayISO } from './helpers'

const CONCUSSION_KEY = 'mindful.v1.concussion.checks'
const PROTOCOL_KEY = 'mindful.v1.concussion.protocol'

interface StoredCheck {
  date: string
  severity: number
  count: number
  answers: Record<string, number>
}

interface StoredProtocol {
  track: string
  stage: number
  startedAt: string
  clinicianCleared: boolean
  atBaseline: boolean
}

/** Put someone mid-protocol with the 24-hour clock already run down. */
async function seedProtocol(page: Page, state: Partial<StoredProtocol>): Promise<void> {
  const yesterday = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [
      PROTOCOL_KEY,
      JSON.stringify({
        track: 'sport',
        stage: 1,
        startedAt: yesterday,
        clinicianCleared: false,
        atBaseline: false,
        ...state,
      }),
    ],
  )
}

const ANCHORS = ['None', 'Mild', 'Mild', 'Moderate', 'Moderate', 'Severe', 'Severe']

/** Click the visible number, which is what a person can actually hit. */
async function rate(page: Page, symptom: string, value: number): Promise<void> {
  await page
    .getByRole('radiogroup', { name: symptom })
    .locator(`label[title="${value} — ${ANCHORS[value]}"]`)
    .click()
}

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
})

test.describe('concussion recovery', () => {
  test('leads with the danger signs, before anything else on the page', async ({ page }) => {
    await page.goto('/recovery')

    const danger = page.getByRole('region', { name: /Get emergency care/ })
    await expect(danger).toBeVisible()

    // The CDC list, in full, unprompted.
    for (const sign of [
      /headache that keeps getting worse/i,
      /Slurred speech/i,
      /One pupil larger than the other/i,
      /Convulsions or seizures/i,
      /Not able to recognise people or places/i,
      /Neck pain or tenderness/i,
    ]) {
      await expect(danger.getByText(sign)).toBeVisible()
    }

    await expect(danger.getByText(/Do not drive yourself/)).toBeVisible()
    await expect(danger.getByText(/must not return to sport on the same day/)).toBeVisible()

    // It sits above the tracking, not after it.
    const dangerBox = await danger.boundingBox()
    const symptoms = await page.getByRole('heading', { name: /Today’s symptoms/ }).boundingBox()
    expect(dangerBox!.y).toBeLessThan(symptoms!.y)
  })

  test('records a 22-symptom check and keeps it on the device', async ({ page }) => {
    await page.goto('/recovery')

    await page.getByRole('button', { name: 'Check my symptoms' }).click()

    // Every one of the 22 is a real radio group.
    await expect(page.getByRole('radiogroup')).toHaveCount(22)

    await rate(page, 'Headache', 4)
    await rate(page, 'Sensitivity to light', 3)
    await rate(page, 'Trouble falling asleep', 2)

    // The rating has to be readable to a screen reader as a value, not a glyph.
    await expect(
      page.getByRole('radiogroup', { name: 'Headache' }).getByRole('radio', { checked: true }),
    ).toHaveAccessibleName('4 out of 6 — Moderate')

    await page.getByRole('button', { name: /Save today/ }).click()

    await expect(page.getByRole('status')).toContainText('Symptom check saved')
    await expect(page.getByText('3 of 22 symptoms present')).toBeVisible()

    const stored = await readStore<StoredCheck[]>(page, CONCUSSION_KEY)
    expect(stored).toHaveLength(1)
    expect(stored?.[0].date).toBe(todayISO())
    expect(stored?.[0].severity).toBe(4 + 3 + 2)
    expect(stored?.[0].count).toBe(3)
    expect(stored?.[0].answers.headache).toBe(4)
  })

  test('a second check on the same day replaces the first', async ({ page }) => {
    await page.goto('/recovery')

    await page.getByRole('button', { name: 'Check my symptoms' }).click()
    await rate(page, 'Headache', 6)
    await page.getByRole('button', { name: /Save today/ }).click()

    await page.getByRole('button', { name: /Update today/ }).click()
    // The earlier answers are still there to amend, not a blank form.
    await expect(
      page.getByRole('radiogroup', { name: 'Headache' }).getByRole('radio').nth(6),
    ).toBeChecked()
    await rate(page, 'Headache', 1)
    await page.getByRole('button', { name: /Save today/ }).click()

    const stored = await readStore<StoredCheck[]>(page, CONCUSSION_KEY)
    expect(stored).toHaveLength(1)
    expect(stored?.[0].severity).toBe(1)
  })

  test('will not let anyone skip the 24 hours between stages', async ({ page }) => {
    await page.goto('/recovery')

    await page.getByRole('button', { name: 'Back to sport' }).click()

    const plan = page.getByRole('region', { name: 'Your return plan' })
    await expect(plan.getByText('Stage 1 of 6', { exact: true })).toBeVisible()
    await expect(plan.getByText(/Symptom-limited activity/)).toBeVisible()

    // Freshly started, so there is no way up yet — and it says why.
    await expect(page.getByRole('button', { name: /Move up to stage 2/ })).toHaveCount(0)
    await expect(page.getByText(/Each stage takes at least 24 hours/)).toBeVisible()

    const stored = await readStore<StoredProtocol>(page, PROTOCOL_KEY)
    expect(stored?.stage).toBe(1)
    expect(stored?.clinicianCleared).toBe(false)
  })

  test('a bad day sends someone back down, and the clock restarts', async ({ page }) => {
    await seedProtocol(page, { stage: 2 })
    await page.goto('/recovery')

    await expect(page.getByText('Stage 2 of 6', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Move up to stage 3/ })).toBeVisible()

    // Saying the stage was too much withdraws the offer immediately.
    await page.getByText('Worse than that').click()
    await expect(page.getByRole('button', { name: /Move up to stage 3/ })).toHaveCount(0)
    await expect(page.getByText(/That stage was too much for today/)).toBeVisible()

    await page.getByRole('button', { name: /go back a stage/ }).click()
    await expect(page.getByText('Stage 1 of 6', { exact: true })).toBeVisible()

    const stored = await readStore<StoredProtocol>(page, PROTOCOL_KEY)
    expect(stored?.stage).toBe(1)
    expect(Date.parse(stored!.startedAt)).toBeGreaterThan(Date.now() - 60_000)
  })

  test('never clears anyone for contact — that needs a clinician', async ({ page }) => {
    await seedProtocol(page, { stage: 4, atBaseline: true })
    await page.goto('/recovery')

    await expect(page.getByText('Stage 4 of 6', { exact: true })).toBeVisible()

    // Stage 5 is full contact. Time served and baseline symptoms are not enough.
    await expect(page.getByRole('button', { name: /Move up to stage 5/ })).toHaveCount(0)
    await expect(page.getByText(/Contact needs a clinician to assess you/)).toBeVisible()
    await expect(page.getByText(/Mindful cannot do that and will not pretend to/)).toBeVisible()

    // Only recording what a clinician said unlocks it.
    await page.getByText(/A clinician has assessed me and cleared me/).click()
    await expect(page.getByRole('button', { name: /Move up to stage 5/ })).toBeVisible()
  })

  test('symptoms must be back to baseline before the contact stages', async ({ page }) => {
    await seedProtocol(page, { stage: 3, atBaseline: false })
    await page.goto('/recovery')

    await expect(page.getByRole('button', { name: /Move up to stage 4/ })).toHaveCount(0)
    await expect(page.getByText(/symptoms need to be back to your normal/)).toBeVisible()

    await page.getByText(/My symptoms are back to how they were/).click()
    await expect(page.getByRole('button', { name: /Move up to stage 4/ })).toBeVisible()
  })

  test('a return of symptoms in the contact stages drops back to stage 3', async ({ page }) => {
    await seedProtocol(page, { stage: 5, atBaseline: true, clinicianCleared: true })
    await page.goto('/recovery')

    await page.getByRole('button', { name: /go back a stage/ }).click()

    // Not stage 4 — back to the last point with no risk of another impact.
    await expect(page.getByText('Stage 3 of 6', { exact: true })).toBeVisible()
  })

  test('return to learn is offered first and has four steps', async ({ page }) => {
    await page.goto('/recovery')

    await expect(page.getByText(/learning takes precedence/)).toBeVisible()
    await page.getByRole('button', { name: 'Back to learning or work' }).click()

    const plan = page.getByRole('region', { name: 'Your return plan' })
    await expect(plan.getByText('Stage 1 of 4', { exact: true })).toBeVisible()
    for (const name of [
      /Daily activities at home/,
      /Schoolwork or work tasks at home/,
      /Part-time, in person/,
      /Full days/,
    ]) {
      await expect(plan.getByText(name)).toBeVisible()
    }
  })

  test('attributes its guidance and states what it cannot do', async ({ page }) => {
    await page.goto('/recovery')

    const evidence = page.getByRole('region', { name: /What the guidance actually says/ })
    // Several cards cite the same body, which is fine — what matters is that
    // every card carries a link to whoever said it.
    const cards = evidence.getByRole('article')
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThanOrEqual(6)
    for (let index = 0; index < cardCount; index += 1) {
      await expect(cards.nth(index).getByRole('link').first()).toHaveAttribute(
        'href',
        /^https:\/\//,
      )
    }
    await expect(
      evidence.getByRole('link', { name: /Amsterdam consensus statement/ }).first(),
    ).toBeVisible()
    await expect(evidence.getByRole('link', { name: /CDC HEADS UP/ }).first()).toBeVisible()
    await expect(evidence.getByText(/Prolonged strict rest is no longer recommended/)).toBeVisible()
    await expect(evidence.getByText(/below the level that makes symptoms worse/)).toBeVisible()

    const limits = page.getByRole('region', { name: 'What this cannot do' })
    await expect(limits.getByText(/does not diagnose a concussion/)).toBeVisible()
    await expect(limits.getByText(/never clears you to return to contact/)).toBeVisible()
    await expect(limits.getByText(/If a clinician has given you a different plan/)).toBeVisible()
  })

  test('cites all three evidence bases the field actually uses', async ({ page }) => {
    await page.goto('/recovery')

    const evidence = page.getByRole('region', { name: /What the guidance actually says/ })
    await expect(
      evidence.getByRole('link', { name: /Amsterdam consensus statement/ }).first(),
    ).toBeVisible()
    await expect(
      evidence.getByRole('link', { name: 'Living Concussion Guidelines' }).first(),
    ).toBeVisible()
    await expect(
      evidence.getByRole('link', { name: /PedsConcussion/ }).first(),
    ).toBeVisible()

    // And the pediatric scope is stated, not implied.
    await expect(evidence.getByText(/Children and teenagers are not small adults/)).toBeVisible()
    const limits = page.getByRole('region', { name: 'What this cannot do' })
    await expect(limits.getByText(/built around guidance for adults/)).toBeVisible()
  })

  test('explains the neuroscience behind its own rules, with sources', async ({ page }) => {
    await page.goto('/recovery')

    const neuro = page.getByRole('region', { name: /What is actually happening in your brain/ })
    await expect(neuro).toBeVisible()

    // The mechanisms that drive the design, each present and attributed.
    await expect(neuro.getByText(/neurometabolic cascade/)).toBeVisible()
    await expect(neuro.getByText(/mismatch between energy demand and energy supply/)).toBeVisible()
    await expect(neuro.getByText(/second impact before recovery/i)).toBeVisible()
    await expect(neuro.getByText(/glymphatic/)).toBeVisible()
    await expect(neuro.getByRole('link', { name: /Giza & Hovda/ }).first()).toBeVisible()
    await expect(neuro.getByRole('link', { name: /Ponsford/ }).first()).toBeVisible()

    // Every card ties the mechanism to a behaviour in the app.
    const inApp = neuro.getByText('In this app:', { exact: false })
    expect(await inApp.count()).toBeGreaterThanOrEqual(6)

    // Hedged where the evidence is: the animal-work caveat survives editing.
    await expect(neuro.getByText(/largely in animals/)).toBeVisible()
  })

  test('prepares a printable summary a clinician can actually use', async ({ page }) => {
    // Two weeks of checks with a clear trend, plus a mid-ladder protocol.
    const checks = Array.from({ length: 10 }, (_, index) => {
      const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000)
      const pad = (value: number) => String(value).padStart(2, '0')
      const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      const headache = Math.min(6, index + 1) // worse further back = recovering
      return {
        id: `conc-${index}`,
        date: day,
        answers: { headache, concentration: 3, sleep: 2 },
        severity: headache + 3 + 2,
        count: 3,
        createdAt: `${day}T09:00:00.000Z`,
      }
    })
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [CONCUSSION_KEY, JSON.stringify(checks)],
    )
    await seedProtocol(page, { track: 'learn', stage: 3 })

    await page.goto('/recovery')

    const summary = page.getByRole('region', { name: 'Appointment summary' })
    await expect(summary).toBeVisible()

    // The table a clinician asks for: dates, totals, and the domain split.
    const table = summary.getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(11) // header + 10 checks
    await expect(table.getByRole('columnheader', { name: 'Cognitive' })).toBeVisible()
    await expect(summary.getByText(/Most affected at the last check/)).toBeVisible()
    await expect(summary.getByText(/Headache \(1\/6\)/)).toBeVisible()

    // Where they are on the ladder, in words, with the honesty markers.
    await expect(summary.getByText(/Return to learning\/work — stage 3 of 4/)).toBeVisible()
    await expect(summary.getByText(/Not a diagnosis/)).toBeVisible()
    await expect(summary.getByRole('button', { name: 'Print this summary' })).toBeVisible()

    // Printing isolates the summary: the rest of the page disappears.
    await page.evaluate(() => document.body.classList.add('printing-summary'))
    await page.emulateMedia({ media: 'print' })

    const visibility = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Sections"]')
      const summaryNode = document.getElementById('appointment-summary')
      return {
        nav: nav ? getComputedStyle(nav).visibility : 'missing',
        summary: summaryNode ? getComputedStyle(summaryNode).visibility : 'missing',
      }
    })
    expect(visibility.nav).toBe('hidden')
    expect(visibility.summary).toBe('visible')
  })

  test('has no WCAG A/AA violations, empty and mid-check', async ({ page }) => {
    await page.goto('/recovery')
    await expectNoA11yViolations(page)

    await page.getByRole('button', { name: 'Check my symptoms' }).click()
    await expectNoA11yViolations(page)
  })
})
