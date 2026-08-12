import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { AppNav } from '../components/AppNav'
import { JournalEntryItem } from '../components/journal/JournalEntryItem'
import { PromptCard } from '../components/journal/PromptCard'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextArea } from '../components/ui/TextArea'
import { useMindfulData, useSampleIds } from '../hooks/useMindfulData'
import { todayISO } from '../lib/date'
import { staggerChild, staggerParent } from '../lib/motion'
import { promptForDate } from '../lib/prompts'
import {
  addJournalEntry,
  clearDraft,
  dismissPrompt,
  isPromptDismissed,
  readDraft,
  saveDraft,
} from '../lib/storage'

/** How long to wait after the last keystroke before the draft is written. */
const AUTOSAVE_DELAY_MS = 500

/**
 * The journal.
 *
 * A prompt you can take or leave, a composer that autosaves as you type, and
 * everything you have written before. No word count, no streak, no "you have
 * not written in 4 days" — the page never asks anything of you.
 */
export function Journal() {
  const today = todayISO()
  const { journal } = useMindfulData()
  const sampleIds = useSampleIds()
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const prompt = promptForDate(today)
  const [dismissed, setDismissed] = useState(() => isPromptDismissed(today))

  // The draft is read once, on mount: whatever was being typed when the tab
  // closed is still there, prompt attachment included.
  const [body, setBody] = useState(() => readDraft()?.body ?? '')
  const [withPrompt, setWithPrompt] = useState(() => Boolean(readDraft()?.prompt))
  const [draftStatus, setDraftStatus] = useState('')
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (!body.trim()) {
      clearDraft()
      setDraftStatus('')
      return
    }

    const timer = window.setTimeout(() => {
      saveDraft({ body, prompt: withPrompt ? prompt : undefined })
      setDraftStatus('Draft saved on this device.')
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [body, withPrompt, prompt])

  function handleSave() {
    if (!body.trim()) {
      setAnnouncement('Write something first — even one line is an entry.')
      composerRef.current?.focus()
      return
    }

    addJournalEntry({ date: today, body, prompt: withPrompt ? prompt : undefined })
    clearDraft()
    setBody('')
    setWithPrompt(false)
    setDraftStatus('')
    setAnnouncement('Entry saved. It stays on this device.')
  }

  function handleDismissPrompt() {
    dismissPrompt(today)
    setDismissed(true)
    setWithPrompt(false)
  }

  return (
    <PageShell nav={<AppNav />}>
      <motion.div variants={staggerParent} initial="hidden" animate="visible">
        <motion.h1 variants={staggerChild} className="text-display-xs text-text sm:text-display-sm">
          Journal
        </motion.h1>

        <motion.p variants={staggerChild} className="mt-3 text-lg text-text-muted">
          {journal.length === 0
            ? 'A blank page, private to this device.'
            : `${journal.length} ${journal.length === 1 ? 'entry' : 'entries'} · private to this device`}
        </motion.p>

        {!dismissed ? (
          <motion.div variants={staggerChild} className="mt-7">
            <PromptCard
              prompt={prompt}
              onDismiss={handleDismissPrompt}
              onUse={() => {
                setWithPrompt(true)
                composerRef.current?.focus()
              }}
            />
          </motion.div>
        ) : null}

        <motion.section variants={staggerChild} className="mt-6" aria-labelledby="composer-heading">
          <Card tone="raised" padding="md">
            <h2 id="composer-heading" className="font-sans text-lg font-medium text-text">
              Write something
            </h2>

            {withPrompt ? (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-hover">
                  Answering today&rsquo;s prompt
                </span>
                <button
                  type="button"
                  onClick={() => setWithPrompt(false)}
                  className="rounded-xs text-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                >
                  Write freely instead
                </button>
              </p>
            ) : null}

            <div className="mt-4">
              <TextArea
                ref={composerRef}
                label="Your entry"
                hideLabel
                rows={8}
                placeholder="However today has been, this page does not mind."
                value={body}
                onChange={(event) => setBody(event.target.value)}
                status={draftStatus}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={handleSave}>
                Save entry
              </Button>
              {body.trim() ? (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setBody('')
                    clearDraft()
                    setDraftStatus('')
                    setAnnouncement('Draft cleared.')
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>

            <p role="status" aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-success">
              {announcement}
            </p>
          </Card>
        </motion.section>

        <motion.section variants={staggerChild} className="mt-12" aria-labelledby="earlier-heading">
          <h2
            id="earlier-heading"
            className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
          >
            Earlier entries
          </h2>

          {journal.length === 0 ? (
            <p className="mt-3 max-w-prose text-text-muted">
              Nothing here yet. When you write something it will collect below, newest first — and
              it stays on this device unless you export it yourself.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {journal.map((entry) => (
                <JournalEntryItem
                  key={entry.id}
                  entry={entry}
                  isSample={sampleIds.includes(entry.id)}
                  onAnnounce={setAnnouncement}
                />
              ))}
            </ul>
          )}
        </motion.section>
      </motion.div>
    </PageShell>
  )
}

export default Journal
