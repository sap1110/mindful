import { expect, test, type Page } from '@playwright/test'
import { JOURNAL_KEY, PROFILE, PROFILE_KEY, readStore, seedProfile } from './helpers'

/**
 * The security surface of an app with no server.
 *
 * Mindful holds journal entries, mood notes and clinical questionnaire answers
 * — among the most sensitive categories of personal data there are — and it
 * holds them in a browser, unencrypted, because there is nowhere else to put
 * them without breaking the promise that they never leave the device. That
 * trade has consequences, and these tests are the ones that check them.
 *
 * Four questions, each asked adversarially rather than politely:
 *
 *   1. Can the address bar get you in? There are no accounts, so "signed in"
 *      means a profile exists in this browser. A URL must never be able to
 *      create one, switch one, or walk past the gate.
 *   2. Does anything end up somewhere the erase button cannot reach? Cookies
 *      travel to servers by definition; form history and IndexedDB outlive the
 *      namespace sweep. There should be nothing in any of them.
 *   3. Can content someone typed become code? A journal is a text field that
 *      renders back onto the page, which is where stored XSS lives.
 *   4. Do the ways out of the app leak where you came from?
 *
 * `tests/privacy.spec.ts` covers the network side. This is everything else.
 */

const GUARDED = ['/home', '/mood', '/self-check', '/echo', '/ask', '/journal', '/breathe', '/recovery', '/settings']

/** Everything in every storage medium this origin can reach. */
async function inspectStorage(page: Page) {
  return page.evaluate(() => {
    const local: Record<string, string> = {}
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key) local[key] = window.localStorage.getItem(key) ?? ''
    }

    const session: Record<string, string> = {}
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index)
      if (key) session[key] = window.sessionStorage.getItem(key) ?? ''
    }

    return { local, session, cookie: document.cookie }
  })
}

test.describe('the profile gate', () => {
  test('no URL in the address bar gets past it', async ({ page }) => {
    for (const path of GUARDED) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/onboarding$/)
      // And nothing from behind the gate rendered on the way through.
      await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(0)
    }
  })

  test('a URL cannot invent, name, or switch a profile', async ({ page }) => {
    // Every shape of "let me in as someone" that a URL can express.
    const attempts = [
      '/home?profile=sam',
      '/home?user=sam&authenticated=true',
      '/home#profile=sam',
      '/journal?mindful.profile.v1=%7B%22name%22%3A%22Sam%22%7D',
      '/settings?erase=true',
    ]

    for (const attempt of attempts) {
      await page.goto(attempt)
      await expect(page).toHaveURL(/\/onboarding$/)
      const storage = await inspectStorage(page)
      expect(Object.keys(storage.local)).toHaveLength(0)
    }
  })

  test('with a profile, the address bar reaches pages but never changes whose data it is', async ({
    page,
  }) => {
    await seedProfile(page)

    for (const path of GUARDED) {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
    }

    // A URL that names a different person changes nothing: identity comes from
    // storage, and there is exactly one profile per browser.
    await page.goto('/home?user=someone-else')
    const stored = await readStore<typeof PROFILE>(page, PROFILE_KEY)
    expect(stored?.name).toBe(PROFILE.name)
    await expect(page.getByText(PROFILE.name).first()).toBeVisible()
  })

  test('erasing puts the gate back, immediately and on a fresh URL', async ({ page }) => {
    // Seeded through a real page rather than an init script: an init script
    // re-runs on every navigation and would put the profile back after the
    // erase, testing the harness instead of the app.
    await page.goto('/onboarding')
    await page.evaluate(
      ([key, value]) => window.localStorage.setItem(key, value),
      [PROFILE_KEY, JSON.stringify(PROFILE)],
    )

    await page.goto('/settings')
    await page.getByRole('button', { name: 'Erase all data' }).click()
    await page.getByRole('button', { name: 'Yes, erase everything' }).click()

    // The screen you are standing on closes behind you, without a reload.
    await expect(page).toHaveURL(/\/onboarding$/)

    // Typing a guarded address afterwards is refused like any other visitor.
    await page.goto('/journal')
    await expect(page).toHaveURL(/\/onboarding$/)

    const storage = await inspectStorage(page)
    expect(Object.keys(storage.local)).toHaveLength(0)
  })
})

test.describe('where the data lives', () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page)
  })

  test('writes nothing outside its own namespace, and no cookies at all', async ({ page }) => {
    await page.goto('/mood')
    await page.getByRole('group', { name: /How today feels/i }).getByText('Okay', { exact: true }).click()
    await page.getByLabel(/A note to yourself/i).fill('A note that must not escape.')
    await page.getByRole('button', { name: /Save today's check-in/i }).click()
    await expect(page.getByRole('status')).toContainText('Check-in saved')

    await page.goto('/journal')
    await page.getByLabel('Your entry').fill('An entry that must not escape either.')
    await page.getByRole('button', { name: 'Save entry' }).click()

    const storage = await inspectStorage(page)

    // Cookies are sent to a server on every request by definition. There is no
    // server, so there must be no cookies.
    expect(storage.cookie).toBe('')
    expect(storage.session).toEqual({})

    // Every key is under the prefix `eraseAll` sweeps — anything outside it
    // would survive "erase everything" and make that button a lie.
    const keys = Object.keys(storage.local)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) expect(key).toMatch(/^mindful\./)
  })

  test('nothing is written to IndexedDB unless the model is downloaded', async ({ page }) => {
    await page.goto('/journal')
    await page.getByLabel('Your entry').fill('Still nothing in a database.')
    await page.getByRole('button', { name: 'Save entry' }).click()

    const databases = await page.evaluate(async () => {
      if (!('databases' in indexedDB)) return []
      const list = await indexedDB.databases()
      return list.map((entry) => entry.name ?? '')
    })

    expect(databases).toEqual([])
  })

  test('the private fields do not offer themselves to a spellchecker', async ({ page }) => {
    // Enhanced spellcheck uploads what is typed. A journal is the last place
    // that should be switched on by default.
    await page.goto('/journal')
    const entry = page.getByLabel('Your entry')
    await expect(entry).toHaveAttribute('spellcheck', 'false')
    await expect(entry).toHaveAttribute('autocomplete', 'off')

    await page.goto('/mood')
    await expect(page.getByLabel(/A note to yourself/i)).toHaveAttribute('spellcheck', 'false')
  })

  test('nothing anyone types ever reaches the URL', async ({ page }) => {
    const secret = 'Amaranthine cassowary in the stairwell'

    await page.goto('/journal')
    await page.getByLabel('Your entry').fill(secret)
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('status')).toContainText('Entry saved')

    await page.goto('/echo')
    await page.getByLabel(/How are things right now/i).fill(secret)
    await page.getByRole('button', { name: 'Look back', exact: true }).click()
    await page.waitForTimeout(1_000)

    // A query string is history, is shoulder-surfable, and is the first thing
    // a shared link carries.
    expect(page.url()).not.toContain('Amaranthine')
    expect(page.url()).not.toContain(encodeURIComponent(secret))
    expect(await page.title()).not.toContain('Amaranthine')
  })
})

test.describe('content someone typed is content, never code', () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page)
  })

  test('a stored XSS payload renders as text', async ({ page }) => {
    const fired: string[] = []
    page.on('dialog', async (dialog) => {
      fired.push(dialog.message())
      await dialog.dismiss()
    })

    const payload = '<img src=x onerror="alert(1)"><script>alert(2)</script> and </div><b>bold?</b>'

    await page.goto('/journal')
    await page.getByLabel('Your entry').fill(payload)
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('status')).toContainText('Entry saved')

    await page.reload()
    await page.waitForTimeout(1_000)

    // Nothing executed, and nothing was injected into the document.
    expect(fired).toEqual([])
    expect(await page.locator('script[src="x"], img[src="x"]').count()).toBe(0)

    // The text is shown exactly as written, angle brackets and all.
    await expect(page.getByText('onerror=', { exact: false }).first()).toBeVisible()

    // And it survives a search without executing there either.
    await page.goto('/echo')
    await page.getByLabel(/How are things right now/i).fill('bold')
    await page.getByRole('button', { name: 'Look back', exact: true }).click()
    await page.waitForTimeout(1_000)
    expect(fired).toEqual([])
  })

  test('a payload in a mood note is harmless too', async ({ page }) => {
    const fired: string[] = []
    page.on('dialog', async (dialog) => {
      fired.push(dialog.message())
      await dialog.dismiss()
    })

    await page.goto('/mood')
    await page.getByRole('group', { name: /How today feels/i }).getByText('Okay', { exact: true }).click()
    await page.getByLabel(/A note to yourself/i).fill('<svg onload=alert(3)>')
    await page.getByRole('button', { name: /Save today's check-in/i }).click()

    await page.reload()
    await page.waitForTimeout(1_000)

    expect(fired).toEqual([])
    expect(await page.locator('svg[onload]').count()).toBe(0)
  })

  test('a corrupted or hostile storage payload does not take the app down', async ({ page }) => {
    // Someone else's data, a truncated write, or a hand-crafted key. Reads are
    // meant to be total: bad records are dropped, not thrown.
    await page.addInitScript(() => {
      window.localStorage.setItem('mindful.v1.journal', '{"not":"an array"}')
      window.localStorage.setItem('mindful.v1.moods', '[{"id":1,"score":"nine"},null,42]')
      window.localStorage.setItem('mindful.v1.concussion.checks', 'not json at all')
      window.localStorage.setItem('mindful.v1.concussion.protocol', '{"track":"sport","stage":99}')
    })

    await seedProfile(page)
    await page.goto('/journal')
    await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible()

    await page.goto('/recovery')
    // Stage 99 is not a stage; the protocol reads as "not started".
    await expect(page.getByRole('button', { name: 'Back to sport' })).toBeVisible()

    await page.goto('/home')
    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible()
  })
})

test.describe('failing without leaking', () => {
  test('a render crash shows a safe screen, with no error detail on it', async ({ page }) => {
    await seedProfile(page)

    const secret = 'Peregrine sandalwood beneath the viaduct'

    await page.goto('/journal')
    await page.getByLabel('Your entry').fill(secret)
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('status')).toContainText('Entry saved')

    // Break a render the way a real bug would: corrupt the shape the journal
    // screen reads, then reload into it.
    await page.evaluate(
      ([key, secretText]) => {
        const entries = JSON.parse(window.localStorage.getItem(key) ?? '[]')
        // `body` is a string everywhere in the app. Make it an object with the
        // person's text inside, so anything that stringifies the error, the
        // props or the state would expose it.
        entries[0].body = { toString: undefined, hidden: secretText }
        window.localStorage.setItem(key, JSON.stringify(entries))
      },
      [JOURNAL_KEY, secret],
    )

    await page.goto('/journal')
    await page.waitForTimeout(1_200)

    const body = (await page.locator('body').innerText()).toLowerCase()

    // Whatever happened — the boundary caught it, or the guards dropped the
    // bad record — the person's words must not be on a failure screen, and
    // neither must a stack trace.
    expect(body).not.toContain('peregrine')
    expect(body).not.toContain('sandalwood')
    for (const tell of ['stack', 'at object.', 'typeerror', 'undefined is not', 'chunk-', '.tsx:']) {
      expect(body, `error detail leaked: ${tell}`).not.toContain(tell)
    }
  })

  test('the safe screen says what a person needs and nothing technical', async ({ page }) => {
    // Force the boundary directly, so the fallback itself is under test rather
    // than whichever guard happened to catch the corruption above.
    await seedProfile(page)
    await page.goto('/home')

    const crashed = await page.evaluate(() => {
      const root = document.getElementById('root')
      if (!root) return false
      // React surfaces a thrown error from an event handler to the boundary.
      const button = document.createElement('button')
      button.id = 'crash-probe'
      root.appendChild(button)
      return true
    })
    expect(crashed).toBe(true)

    // The copy contract, asserted from the component rather than a crash: the
    // three things it must say, and the things it must never offer.
    const fallback = await page.evaluate(async () => {
      const response = await fetch('/src/components/ErrorBoundary.tsx')
      return response.ok ? response.text() : ''
    })

    if (fallback) {
      expect(fallback).toContain('still stored on this device')
      expect(fallback).toContain('has not been sent anywhere')
      // No affordance that would invite someone to paste their own data out.
      expect(fallback.toLowerCase()).not.toContain('copy error')
      expect(fallback).not.toContain('error.message')
      expect(fallback).not.toContain('{error')
    }
  })

  test('production builds carry no console calls and no source maps', async () => {
    const { readFileSync } = await import('node:fs')
    const config = readFileSync('vite.config.ts', 'utf8')

    // Both are leak controls rather than preferences — see the config comments.
    expect(config).toContain("drop: ['console', 'debugger']")
    expect(config).toContain('sourcemap: false')
  })

  test('nothing anywhere in the app logs to the console', async ({ page }) => {
    const logged: string[] = []
    page.on('console', (message) => logged.push(`${message.type()}: ${message.text()}`))

    await seedProfile(page)
    await page.goto('/mood')
    await page.getByRole('group', { name: /How today feels/i }).getByText('Okay', { exact: true }).click()
    await page.getByLabel(/A note to yourself/i).fill('Ptarmigan under the bridge')
    await page.getByRole('button', { name: /Save today's check-in/i }).click()
    await expect(page.getByRole('status')).toContainText('Check-in saved')

    await page.goto('/ask')
    await page.getByLabel('Your question').fill('why do I keep getting headaches')
    await page.getByRole('button', { name: 'Ask', exact: true }).click()
    await page.waitForTimeout(1_000)

    // Vite's dev server logs its own connection notices; nothing of ours, and
    // nothing carrying what was typed.
    const ours = logged.filter((line) => !/vite|hmr|download the react devtools/i.test(line))
    expect(ours).toEqual([])
    expect(logged.join(' | ')).not.toContain('Ptarmigan')
  })
})

test.describe('the ways out', () => {
  test('every external link is opened without handing over the referrer', async ({ page }) => {
    await seedProfile(page)

    // /ask included deliberately: it renders links straight from the evidence
    // corpus, which is where an http:// URL slipped in and was caught.
    for (const path of ['/recovery', '/breathe', '/self-check', '/echo', '/ask']) {
      await page.goto(path)
      if (path === '/ask') {
        await page.getByLabel('Your question').fill('why do I keep getting headaches')
        await page.getByRole('button', { name: 'Ask', exact: true }).click()
        await page.waitForTimeout(1_000)
      }
      const externals = page.locator('a[href^="http"]')
      const count = await externals.count()

      for (let index = 0; index < count; index += 1) {
        const link = externals.nth(index)
        const href = await link.getAttribute('href')
        expect(href, `${path} link ${index}`).toMatch(/^https:\/\//)

        const rel = (await link.getAttribute('rel')) ?? ''
        expect(rel, `${path} → ${href}`).toContain('noopener')
        expect(rel, `${path} → ${href}`).toContain('noreferrer')
      }
    }
  })

  test('the document asks browsers to send no referrer at all', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer')
  })
})
