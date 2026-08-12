import { motion } from 'framer-motion'
import { Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppNav } from '../components/AppNav'
import { MoodHistory } from '../components/mood/MoodHistory'
import { MoodScale } from '../components/mood/MoodScale'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { TextArea } from '../components/ui/TextArea'
import { useMindfulData, useSampleIds } from '../hooks/useMindfulData'
import { formatLongDay, todayISO } from '../lib/date'
import { MOOD_TAGS, NOTE_MAX_LENGTH, moodLevel } from '../lib/mood'
import { staggerChild, staggerParent } from '../lib/motion'
import { deleteMoodEntry, saveMoodEntry, type MoodScore } from '../lib/storage'

/**
 * The daily check-in.
 *
 * One entry per calendar day, editable for as long as that day lasts. If today
 * already has one the screen opens on it — prefilled, with the heading and the
 * button both saying so — rather than presenting a blank form that would make
 * a second visit feel like starting again.
 */
export function Mood() {
  const today = todayISO()
  const { moods } = useMindfulData()
  const existing = useMemo(() => moods.find((entry) => entry.date === today), [moods, today])
  const sampleIds = useSampleIds()

  const [score, setScore] = useState<MoodScore | null>(existing?.score ?? null)
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [note, setNote] = useState(existing?.note ?? '')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  // The stored entry is the source of truth for "have I checked in today"; the
  // three pieces of local state are just the form's working copy of it.
  const isEditing = Boolean(existing)
  const level = score === null ? null : moodLevel(score)

  function toggleTag(id: string) {
    setTags((current) =>
      current.includes(id) ? current.filter((tag) => tag !== id) : [...current, id],
    )
  }

  function handleSave() {
    if (score === null) {
      setError('Choose how today feels first — anything else is optional.')
      setStatus('')
      return
    }

    saveMoodEntry({ date: today, score, tags, note })
    setError('')
    setStatus(
      `${isEditing ? "Today's check-in updated" : 'Check-in saved'} — ${moodLevel(score).label}.`,
    )
  }

  function handleRemove() {
    deleteMoodEntry(today)
    setScore(null)
    setTags([])
    setNote('')
    setError('')
    setStatus("Today's check-in was removed. You can add another whenever you like.")
  }

  return (
    <PageShell nav={<AppNav />}>
      <motion.div variants={staggerParent} initial="hidden" animate="visible">
        <motion.p
          variants={staggerChild}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
        >
          {formatLongDay(today)}
        </motion.p>

        <motion.h1 variants={staggerChild} className="mt-3 text-display-xs text-text sm:text-display-sm">
          How are you today?
        </motion.h1>

        <motion.p variants={staggerChild} className="mt-4 max-w-prose text-lg text-text-muted">
          {isEditing
            ? 'You already checked in today. Change anything you like — it stays one entry for today.'
            : 'One check-in a day, and it takes about two seconds. Skipping a day costs you nothing.'}
        </motion.p>

        <motion.div variants={staggerChild} className="mt-8">
          <Card tone="raised" padding="md">
            {isEditing ? (
              <p className="mb-5 inline-flex items-center gap-2 rounded-pill bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-hover">
                <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                Updating today&rsquo;s check-in
              </p>
            ) : null}

            <MoodScale legend="How today feels" value={score} onChange={setScore} />

            {level ? (
              <p className="mt-3 text-sm text-text-muted">
                <span className="font-medium text-text">{level.label}</span> — {level.hint}.
              </p>
            ) : null}

            <fieldset className="mt-7 border-0 p-0">
              <legend className="mb-3 text-sm font-medium text-text">
                Anything else going on? <span className="text-text-subtle">(optional)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {MOOD_TAGS.map((tag) => (
                  <Chip
                    key={tag.id}
                    selectionMode="multi"
                    label={tag.label}
                    name="mood-tags"
                    value={tag.id}
                    checked={tags.includes(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-7">
              <TextArea
                label={
                  <>
                    A note to yourself <span className="text-text-subtle">(optional)</span>
                  </>
                }
                rows={3}
                maxLength={NOTE_MAX_LENGTH}
                placeholder="Anything you want to add?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={handleSave}>
                {isEditing ? "Update today's check-in" : "Save today's check-in"}
              </Button>
              {isEditing ? (
                <Button variant="ghost" size="md" onClick={handleRemove}>
                  Remove today&rsquo;s check-in
                </Button>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium text-accent-hover">
                {error}
              </p>
            ) : null}

            <p role="status" aria-live="polite" className="mt-3 text-sm text-success">
              {status}
            </p>
          </Card>
        </motion.div>

        <motion.div variants={staggerChild}>
          <MoodHistory className="mt-12" entries={moods} sampleIds={sampleIds} />
        </motion.div>
      </motion.div>
    </PageShell>
  )
}

export default Mood
