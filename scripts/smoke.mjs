/**
 * Browser smoke test for the Phase 1 flow.
 *
 * Drives a real Chromium through landing → onboarding → completion → home,
 * asserting the things a typecheck cannot see (does it render, does the gate
 * work, does the profile persist), and drops screenshots in .screenshots/ so
 * the visual design can be reviewed without booting anything.
 *
 *   npm run dev            # in one terminal
 *   node scripts/smoke.mjs # in another (BASE_URL overrides the default port)
 */
import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5178'
const SHOTS = new URL('../.screenshots/', import.meta.url).pathname

/** Let the entrance animations finish so screenshots show settled states. */
const settle = (target) => target.waitForTimeout(1400)

const checks = []
function check(label, ok, detail = '') {
  checks.push({ label, ok, detail })
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? ` — ${detail}` : ''}`)
}

/** axe-core scan limited to the WCAG 2.1 A/AA rule sets we are claiming. */
async function auditA11y(target, label) {
  const { violations } = await new AxeBuilder({ page: target })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  check(
    `a11y: no WCAG A/AA violations on ${label}`,
    violations.length === 0,
    violations.map((v) => `${v.id} (${v.nodes.length})`).join(', '),
  )
}

await mkdir(SHOTS, { recursive: true })

const browser = await chromium.launch()
const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await desktop.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (error) => consoleErrors.push(String(error)))

/* ------------------------------------------------------------- landing */

await page.goto(BASE_URL, { waitUntil: 'networkidle' })

const heading = (await page.locator('h1').first().textContent())?.trim() ?? ''
check('landing renders its h1', heading.includes('quieter place'), heading)
check(
  'landing shows the medical disclaimer',
  (await page.getByText('Not medical advice').count()) > 0,
)
check('skip link exists', (await page.locator('a.skip-link').count()) === 1)
await settle(page)
await page.screenshot({ path: `${SHOTS}01-landing.png`, fullPage: true })
await auditA11y(page, 'landing')

/* ---------------------------------------------------------- the gate */

await page.goto(`${BASE_URL}/home`, { waitUntil: 'networkidle' })
check('/home without a profile redirects to onboarding', new URL(page.url()).pathname === '/onboarding')

/* --------------------------------------------------------- onboarding */

await page.getByLabel(/Your name/i).fill('Sam')
await settle(page)
await page.screenshot({ path: `${SHOTS}02-onboarding-name.png`, fullPage: true })
await auditA11y(page, 'onboarding step 1')
await page.getByRole('button', { name: /Continue/i }).click()

await page.getByRole('heading', { name: /What has been on your mind/i }).waitFor()
check('step 2 reached', true)
// Click the visible tile, the way a person would — the input itself is sr-only.
check(
  'reason tiles expose real checkbox semantics',
  (await page.getByRole('checkbox', { name: /Anxious thoughts/i }).count()) === 1,
)
await page.getByText('Anxious thoughts', { exact: true }).click()
await page.getByText('Rest and sleep', { exact: true }).click()
check(
  'checking a tile updates the underlying input',
  await page.getByRole('checkbox', { name: /Anxious thoughts/i }).isChecked(),
)
await settle(page)
await page.screenshot({ path: `${SHOTS}03-onboarding-reasons.png`, fullPage: true })
await auditA11y(page, 'onboarding step 2')
await page.getByRole('button', { name: /Continue/i }).click()

await page.getByRole('heading', { name: /When things get heavy/i }).waitFor()

// Submitting with nothing chosen must surface a validation message, not proceed.
await page.getByRole('button', { name: /Finish/i }).click()
check(
  'step 3 validates an empty choice',
  (await page.getByText(/Choose the one that feels closest/i).count()) > 0,
)

check(
  'coping tiles expose real radio semantics',
  (await page.getByRole('radio', { name: /Grounding/i }).count()) === 1,
)
await page.getByText('Grounding', { exact: true }).click()
await settle(page)
await page.screenshot({ path: `${SHOTS}04-onboarding-style.png`, fullPage: true })
await auditA11y(page, 'onboarding step 3')
await page.getByRole('button', { name: /Finish/i }).click()

/* --------------------------------------------------------- completion */

await page.getByRole('heading', { name: /You.re all set, Sam/i }).waitFor()
check('completion state shown', true)
check(
  'completion carries the crisis disclaimer',
  (await page.getByText(/find a crisis helpline/i).count()) > 0,
)
await settle(page)
await page.screenshot({ path: `${SHOTS}05-complete.png`, fullPage: true })
await auditA11y(page, 'completion')

const stored = await page.evaluate(() => window.localStorage.getItem('mindful.profile.v1'))
const profile = stored ? JSON.parse(stored) : null
check('profile persisted on-device', profile?.name === 'Sam' && profile?.copingStyle === 'grounding')
check('reasons persisted', JSON.stringify(profile?.reasons) === JSON.stringify(['anxiety', 'sleep']))

/* --------------------------------------------------------------- home */

await page.getByRole('link', { name: /Go to your space/i }).click()
await page.getByRole('heading', { name: /Hello, Sam/i }).waitFor()
check('home reached after onboarding', new URL(page.url()).pathname === '/home')
await settle(page)
await page.screenshot({ path: `${SHOTS}06-home.png`, fullPage: true })
await auditA11y(page, 'home')

// A reload must land straight on /home — the gate reads the stored profile.
await page.goto(`${BASE_URL}/home`, { waitUntil: 'networkidle' })
check('gate lets a returning visitor into /home', (await page.getByRole('heading', { name: /Hello, Sam/i }).count()) > 0)

// And /onboarding must bounce someone who has already finished.
await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' })
check('completed profile skips onboarding', new URL(page.url()).pathname === '/home')

/* ------------------------------------------------------ mobile + a11y */

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mobile = await mobileContext.newPage()
await mobile.goto(BASE_URL, { waitUntil: 'networkidle' })
await settle(mobile)
await mobile.screenshot({ path: `${SHOTS}07-landing-mobile.png`, fullPage: true })
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
)
check('no horizontal overflow at 390px', overflow <= 0, `${overflow}px`)
await mobile.close()

check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

await browser.close()

const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
console.log(`screenshots: ${SHOTS}`)
process.exit(failed.length === 0 ? 0 : 1)
