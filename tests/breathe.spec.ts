import { expect, test } from '@playwright/test'
import {
  BREATHING_KEY,
  VOICE_KEY,
  expectNoA11yViolations,
  readStore,
  seedProfile,
  spokenLines,
  stubVoices,
} from './helpers'

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
    await expect(page.getByText('No streaks here, and the voice is optional.')).toBeVisible()
  })

  test('states the safety cautions before anything starts', async ({ page }) => {
    await page.goto('/breathe')

    const safety = page.getByRole('region', { name: 'Before you start' })
    await expect(safety).toBeVisible()
    await expect(safety.getByText(/dizzy, lightheaded or tingly/)).toBeVisible()
    await expect(safety.getByText(/never while driving, cycling, in water/)).toBeVisible()

    // Box holds the breath, so it carries a caution the 5-5 rhythm does not.
    await expect(safety.getByText(/holds the breath twice a round/)).toBeVisible()

    await page.getByText('Relaxed', { exact: true }).click()
    await expect(safety.getByText(/holds the breath twice a round/)).toHaveCount(0)

    // And it says which rhythm a health body actually describes.
    await expect(safety.getByText(/The NHS describes this rhythm/)).toBeVisible()
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

/**
 * The spoken guide, against a stubbed speech engine.
 *
 * The assertions are about *what is said and when* — a safety line before the
 * first breath, one cue per phase, nothing spoken when the guide is off. The
 * audio itself is the platform's problem; the script is ours.
 */
test.describe('spoken guide', () => {
  test.beforeEach(async ({ page }) => {
    await stubVoices(page)
  })

  test('offers only on-device voices', async ({ page }) => {
    await page.goto('/breathe')

    await page.getByText('Guide me by voice').click()

    const picker = page.getByLabel('Which voice')
    await expect(picker).toBeVisible()

    // The two localService voices, and emphatically not the cloud-backed one.
    const options = await picker.locator('option').allTextContents()
    expect(options).toEqual(['Test Calm (en-GB)', 'Test Plain (en-US)'])
    expect(options.join(' ')).not.toContain('Google Remote')

    await expect(page.getByText(/Only voices installed on this device/)).toBeVisible()

    await page.getByRole('button', { name: 'Hear this voice' }).click()
    await expect.poll(() => spokenLines(page)).toContainEqual(
      expect.stringContaining('This is the voice that will guide you'),
    )
  })

  test('speaks the safety line before the first breath, then one cue per step', async ({
    page,
  }) => {
    await page.goto('/breathe')
    await page.getByText('Guide me by voice').click()
    await page.getByRole('button', { name: 'Begin' }).click()

    // The lead-in, then the phases, in that order and one line each.
    await expect
      .poll(() => spokenLines(page).then((lines) => lines.length), { timeout: 12_000 })
      .toBeGreaterThanOrEqual(3)

    const [intro, ...cues] = await spokenLines(page)

    // The lead-in comes first, and it carries the caution.
    expect(intro).toContain('dizzy or lightheaded')
    expect(intro).toContain("Don't force the holds")

    // Box is 4-4-4-4, so the first two steps are always these.
    expect(cues.slice(0, 2)).toEqual(['Breathe in', 'Hold'])
  })

  test('says nothing at all when the guide is off', async ({ page }) => {
    await page.goto('/breathe')

    // A voice is available and simply not switched on — otherwise this test
    // would pass just as happily on a page with no speech engine at all.
    await expect(page.getByText('Guide me by voice')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Guide me by voice' })).not.toBeChecked()

    await page.getByRole('button', { name: 'Begin' }).click()
    await page.waitForTimeout(5_000)

    // The session really did run; it just ran silently.
    await expect(page.getByText(/left in this step/)).toBeVisible()
    expect(await spokenLines(page)).toEqual([])
  })
})

test.describe('eyes-closed mode', () => {
  test.beforeEach(async ({ page }) => {
    await stubVoices(page)
  })

  test('asks the safety checks once, then dims the screen and leads by voice', async ({ page }) => {
    await page.goto('/breathe')
    await page.getByText('Guide me by voice').click()
    await page.getByText('Eyes closed').click()

    await page.getByRole('button', { name: 'Begin' }).click()

    // The one-time check has to be answered before the screen goes dark.
    const consent = page.getByRole('dialog', { name: 'Before you close your eyes' })
    await expect(consent).toBeVisible()
    await expect(consent.getByText(/not driving, cycling, in or near water/)).toBeVisible()

    await consent.getByRole('button', { name: 'Not now' }).click()
    await expect(consent).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible()

    await page.getByRole('button', { name: 'Begin' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /somewhere safe/ }).click()

    const dark = page.getByRole('dialog', { name: 'Eyes-closed breathing session' })
    await expect(dark).toBeVisible()
    await expect(dark.getByText('Close your eyes')).toBeVisible()

    // The lead-in says so aloud too, for the person who already closed them.
    await expect.poll(() => spokenLines(page)).toContainEqual(
      expect.stringContaining("close your eyes — you won't need the screen"),
    )

    // Tapping anywhere pauses: nobody with their eyes shut can aim at a button.
    await expect(dark.getByText('Breathe in')).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(1_200)
    await dark.getByRole('button', { name: 'Pause the session' }).click()
    await expect(dark.getByText('Paused')).toBeVisible()

    // And Escape stops, without looking.
    await page.keyboard.press('Escape')
    await expect(dark).toHaveCount(0)
    await expect(page.getByRole('status')).toContainText('Session recorded')

    const stored = await readStore<unknown[]>(page, BREATHING_KEY)
    expect(stored).toHaveLength(1)
  })

  test('remembers the acknowledgement, and never turns the screen dark without a voice', async ({
    page,
  }) => {
    await page.goto('/breathe')
    await page.getByText('Guide me by voice').click()
    await page.getByText('Eyes closed').click()
    await page.getByRole('button', { name: 'Begin' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /somewhere safe/ }).click()

    const dark = page.getByRole('dialog', { name: 'Eyes-closed breathing session' })
    await expect(dark.getByText('Breathe in')).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(1_200)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Start another' }).click()

    // Second time: straight into the session, no second confirmation.
    await page.getByRole('button', { name: 'Begin' }).click()
    await expect(page.getByRole('dialog', { name: 'Before you close your eyes' })).toHaveCount(0)
    await expect(dark).toBeVisible()
    await expect(dark.getByText('Breathe in')).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(1_200)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Start another' }).click()

    // Switching the voice off takes eyes-closed with it — a dark screen with no
    // guidance is not a feature.
    await page.getByText('Guide me by voice').click()
    expect(await readStore<{ eyesClosed: boolean }>(page, VOICE_KEY)).toMatchObject({
      enabled: false,
      eyesClosed: false,
    })

    await page.getByRole('button', { name: 'Begin' }).click()
    await expect(page.getByRole('dialog', { name: 'Eyes-closed breathing session' })).toHaveCount(0)
  })

  test('has no WCAG A/AA violations with the screen dimmed', async ({ page }) => {
    await page.goto('/breathe')
    await page.getByText('Guide me by voice').click()
    await page.getByText('Eyes closed').click()
    await page.getByRole('button', { name: 'Begin' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /somewhere safe/ }).click()

    await expect(
      page.getByRole('dialog', { name: 'Eyes-closed breathing session' }),
    ).toBeVisible()
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
