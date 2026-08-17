import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { todayISO } from '../../lib/date'
import { JOURNAL_PROMPTS, promptForDate } from '../../lib/prompts'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { TextArea } from '../ui/TextArea'

/**
 * The composer, with today's real prompt in it.
 *
 * `promptForDate` is the same function the journal screen calls, so a visitor
 * sees the question they would actually be asked today rather than a sample
 * one. The "another one" control is a tour affordance: on the real screen the
 * prompt is fixed for the day and dismissable, which is the point — it is a
 * question, not a task that reshuffles until you answer it.
 */
export function JournalDemo() {
  const [offset, setOffset] = useState(0)
  const [body, setBody] = useState('')

  const today = promptForDate(todayISO())
  const index = (JOURNAL_PROMPTS.indexOf(today) + offset) % JOURNAL_PROMPTS.length
  const prompt = JOURNAL_PROMPTS[index] ?? today

  const words = body.trim().length === 0 ? 0 : body.trim().split(/\s+/).length

  return (
    <Card tone="sunken" padding="md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
          {offset === 0 ? 'Today’s prompt' : 'Another prompt'}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOffset((current) => current + 1)}
          iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Another one
        </Button>
      </div>

      <p aria-live="polite" className="mt-2 max-w-prose font-display text-xl text-text">
        {prompt}
      </p>

      <div className="mt-5">
        <TextArea
          label="Write as much or as little as you like"
          hint="On the real screen this is kept on your device as you type. Here it is kept nowhere."
          placeholder="Or ignore the question entirely and write about something else."
          value={body}
          rows={4}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>

      <p aria-live="polite" className="mt-3 text-sm text-text-subtle">
        {words === 0
          ? 'A blank page is a perfectly good entry to not write.'
          : `${words} ${words === 1 ? 'word' : 'words'} — and no, still nowhere.`}
      </p>
    </Card>
  )
}

export default JournalDemo
