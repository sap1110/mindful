import { defineConfig, devices } from '@playwright/test'

/** Kept off Vite's default 5173 so a dev server you already have open survives. */
const PORT = 5178
const baseURL = `http://127.0.0.1:${PORT}`

/**
 * The browser suite: every screen rendered in a real Chromium, driven the way
 * a person would drive it, with an axe-core WCAG 2.1 A/AA scan on each one.
 *
 * `scripts/smoke.mjs` still exists for a quick screenshot pass during design
 * work; this is the version that gates the branch.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  // Generous: a few specs walk a whole flow and pause for entrance animations
  // to settle before each axe scan.
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // `--host 127.0.0.1` rather than Vite's default localhost binding, which
    // resolves to IPv6-only on some machines and leaves the suite waiting.
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
