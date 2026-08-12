import { motion } from 'framer-motion'
import { Database, Download, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { AppNav } from '../components/AppNav'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useMindfulData, useSampleIds } from '../hooks/useMindfulData'
import { useProfile } from '../hooks/useProfile'
import { staggerChild, staggerParent } from '../lib/motion'
import { loadSampleData, removeSampleData } from '../lib/sampleData'
import { downloadExport, eraseAll } from '../lib/storage'

/**
 * Settings — really "your data".
 *
 * Everything Mindful knows lives in this browser, so the honest version of a
 * settings screen is a way to take it with you, a way to destroy it, and a way
 * to fill the app with obviously-fake entries so the charts have something to
 * show. Each control says plainly what it will do before you press it.
 */
export function Settings() {
  const { profile, resetProfile } = useProfile()
  const { moods, journal, breathing, screeners } = useMindfulData()
  const sampleIds = useSampleIds()

  const [confirmingErase, setConfirmingErase] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const hasSample = sampleIds.length > 0
  const total = moods.length + journal.length + breathing.length + screeners.length

  function handleExport() {
    downloadExport()
    setAnnouncement('Export downloaded as a JSON file.')
  }

  function handleErase() {
    // eraseAll sweeps every key under the mindful namespace, the onboarding
    // profile included, so clearing the profile in memory too leaves the gate
    // to do what it already does for a first-time visitor: show the way in.
    eraseAll()
    resetProfile()
  }

  function handleToggleSample() {
    if (hasSample) {
      removeSampleData()
      setAnnouncement('Sample data removed. Only your own entries remain.')
      return
    }

    loadSampleData()
    setAnnouncement('Sample data loaded. Every sample entry is labelled, and you can remove it.')
  }

  return (
    <PageShell nav={<AppNav />}>
      <motion.div variants={staggerParent} initial="hidden" animate="visible">
        <motion.h1 variants={staggerChild} className="text-display-xs text-text sm:text-display-sm">
          Your data
        </motion.h1>

        <motion.p variants={staggerChild} className="mt-3 max-w-prose text-lg text-text-muted">
          Mindful keeps everything in this browser. There is no account and no server, so nothing
          you write here is sent anywhere.
        </motion.p>

        <motion.p variants={staggerChild} className="mt-2 text-sm text-text-subtle">
          {total === 0
            ? 'Nothing stored yet.'
            : `${moods.length} check-${moods.length === 1 ? 'in' : 'ins'} · ${journal.length} ${
                journal.length === 1 ? 'entry' : 'entries'
              } · ${breathing.length} breathing ${
                breathing.length === 1 ? 'session' : 'sessions'
              } · ${screeners.length} self-check${screeners.length === 1 ? '' : 's'}${
                profile ? ` · profile for ${profile.name}` : ''
              }`}
        </motion.p>

        <p role="status" aria-live="polite" className="mt-4 min-h-[1.25rem] text-sm text-success">
          {announcement}
        </p>

        <motion.section variants={staggerChild} className="mt-4" aria-labelledby="export-heading">
          <Card tone="raised" padding="md">
            <h2 id="export-heading" className="font-sans text-lg font-medium text-text">
              Take a copy with you
            </h2>
            <p className="mt-2 max-w-prose text-text-muted">
              Downloads one JSON file holding every check-in, entry and session on this device. It
              is yours — keep it, move it to another browser, or read it in any text editor.
            </p>
            <div className="mt-5">
              <Button
                variant="secondary"
                size="lg"
                iconLeft={<Download className="h-4 w-4" />}
                onClick={handleExport}
              >
                Export my data
              </Button>
            </div>
          </Card>
        </motion.section>

        <motion.section variants={staggerChild} className="mt-6" aria-labelledby="sample-heading">
          <Card padding="md">
            <h2 id="sample-heading" className="font-sans text-lg font-medium text-text">
              Sample data
            </h2>
            <p className="mt-2 max-w-prose text-text-muted">
              Fills the app with a made-up month so you can see how the history looks before you
              have one of your own. Sample entries are marked{' '}
              <span className="rounded-pill bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted">
                Sample
              </span>{' '}
              wherever they appear, they never overwrite a day you have already logged, and
              removing them leaves your own entries untouched.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                iconLeft={<Database className="h-4 w-4" />}
                onClick={handleToggleSample}
              >
                {hasSample ? 'Remove sample data' : 'Load sample data'}
              </Button>
              <p className="text-sm text-text-subtle">
                {hasSample
                  ? `${sampleIds.length} sample records loaded.`
                  : 'Nothing is loaded right now.'}
              </p>
            </div>
          </Card>
        </motion.section>

        <motion.section variants={staggerChild} className="mt-6" aria-labelledby="erase-heading">
          <Card padding="md" className="border-accent/30">
            <h2 id="erase-heading" className="flex items-center gap-2 font-sans text-lg font-medium text-text">
              <TriangleAlert aria-hidden="true" className="h-4.5 w-4.5 text-accent" />
              Erase everything
            </h2>
            <p className="mt-2 max-w-prose text-text-muted">
              Deletes every check-in, journal entry, breathing session, self-check result and your
              profile from this browser. There is no copy anywhere else, so this cannot be undone —
              export first if you might want it later.
            </p>

            {confirmingErase ? (
              <div className="mt-5 rounded-2xl border border-accent/40 bg-accent-soft/50 p-4">
                <p className="text-text">
                  Erase all {total} record{total === 1 ? '' : 's'} and your profile? You will be
                  taken back to the start.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="secondary" size="md" onClick={handleErase}>
                    Yes, erase everything
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setConfirmingErase(false)}>
                    Keep my data
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <Button variant="ghost" size="lg" onClick={() => setConfirmingErase(true)}>
                  Erase all data
                </Button>
              </div>
            )}
          </Card>
        </motion.section>
      </motion.div>
    </PageShell>
  )
}

export default Settings
