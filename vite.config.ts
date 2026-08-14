import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },

  /**
   * Strip every `console.*` and `debugger` from production builds.
   *
   * Not tidiness — a leak control. This app holds journal entries and
   * questionnaire answers, and the most likely way any of it ever reaches
   * somewhere it should not is a stray log line: a `console.log(entry)` left in
   * during debugging, an error handler that prints the string it choked on, a
   * library logging its input. Anything logged is readable over a shoulder, by
   * a browser extension with devtools access, or by whoever picks up an
   * unlocked laptop.
   *
   * Dropping them at build time means that class of mistake cannot ship, rather
   * than relying on nobody making it. Development keeps its logs.
   */
  esbuild: {
    drop: ['console', 'debugger'],
  },

  build: {
    /**
     * No source maps in production.
     *
     * Vite's default is already `false`; it is stated explicitly because the
     * reason matters. A source map hands anyone with devtools the original,
     * commented source — including the crisis-detection patterns, which are
     * the one part of this codebase that is meaningfully easier to evade if
     * you can read it.
     */
    sourcemap: false,
  },
})
