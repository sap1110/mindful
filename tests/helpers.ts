import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const PROFILE_KEY = 'mindful.profile.v1'
export const MOODS_KEY = 'mindful.v1.moods'
export const JOURNAL_KEY = 'mindful.v1.journal'
export const BREATHING_KEY = 'mindful.v1.breathing'

/** A completed onboarding, so a test can start on the screen it cares about. */
export const PROFILE = {
  version: 1,
  name: 'Sam',
  reasons: ['anxiety', 'sleep'],
  copingStyle: 'grounding',
  completedAt: '2026-01-01T09:00:00.000Z',
}

/**
 * Put a profile in localStorage before the app boots, so the auth gate lets us
 * straight through. Uses an init script rather than an evaluate-then-reload so
 * the very first render already sees it.
 */
export async function seedProfile(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value)
    },
    [PROFILE_KEY, JSON.stringify(PROFILE)],
  )
}

/** Today in the browser's timezone, formatted the way storage stores it. */
export function todayISO(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Read one storage key back out of the page as parsed JSON. */
export async function readStore<T>(page: Page, key: string): Promise<T | null> {
  const raw = await page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key)
  return raw ? (JSON.parse(raw) as T) : null
}

/** Let the entrance animations finish. Mid-fade text is genuinely low-contrast. */
export async function settle(page: Page): Promise<void> {
  await page.waitForTimeout(1_500)
}

/**
 * The WCAG 2.1 A/AA rule sets this project claims to meet.
 *
 * Scans a settled page: axe measures the colours actually on screen, so
 * auditing halfway through a fade-in reports contrast failures that no one
 * ever sees.
 */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  await settle(page)

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(violations.map((violation) => `${violation.id} (${violation.nodes.length} nodes)`)).toEqual(
    [],
  )
}

/** Collect anything the page logs as an error, to assert on at the end. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))
  return errors
}
