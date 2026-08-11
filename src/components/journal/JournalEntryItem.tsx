import { Pencil, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '../../lib/cn'
import { describeDay, formatTime } from '../../lib/date'
import { deleteJournalEntry, updateJournalEntry, type JournalEntry } from '../../lib/storage'
import { Button } from '../ui/Button'
import { TextArea } from '../ui/TextArea'

export interface JournalEntryItemProps {
  entry: JournalEntry
  /** Seeded by the sample-data toggle — say so rather than passing it off. */
  isSample?: boolean
  /** Bubble up what happened so the page can announce it once, politely. */
  onAnnounce: (message: string) => void
}

type Mode = 'read' | 'edit' | 'confirming'

/**
 * One past entry: collapsed to a few lines, expandable to the whole thing,
 * editable in place, and deletable only after an explicit confirmation.
 *
 * Expansion is a button with `aria-expanded`/`aria-controls` rather than a
 * hover reveal, and the delete confirmation is inline instead of a modal —
 * no focus trap to get wrong, and nothing is destroyed by a single tap.
 */
export function JournalEntryItem({ entry, isSample, onAnnounce }: JournalEntryItemProps) {
  const bodyId = useId()
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<Mode>('read')
  const [draft, setDraft] = useState(entry.body)

  const edited = entry.updatedAt !== entry.createdAt

  function handleSave() {
    const next = draft.trim()
    if (!next) {
      onAnnounce('An entry cannot be empty. Delete it instead if you want it gone.')
      return
    }
    updateJournalEntry(entry.id, next)
    setMode('read')
    setExpanded(true)
    onAnnounce('Entry updated.')
  }

  function handleDelete() {
    deleteJournalEntry(entry.id)
    onAnnounce('Entry deleted.')
  }

  return (
    <li className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-text-subtle">
          {describeDay(entry.date)} · {formatTime(entry.createdAt)}
        </h3>
        <p className="flex items-center gap-2 text-2xs text-text-subtle">
          {edited ? <span>edited</span> : null}
          {isSample ? (
            <span className="rounded-pill bg-surface-muted px-2 py-0.5 font-medium text-text-muted">
              Sample
            </span>
          ) : null}
        </p>
      </div>

      {entry.prompt ? (
        <p className="mt-2 border-l-2 border-clay-200 pl-3 text-sm italic text-text-muted">
          {entry.prompt}
        </p>
      ) : null}

      {mode === 'edit' ? (
        <div className="mt-3">
          <TextArea
            label="Edit this entry"
            hideLabel
            rows={8}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSave}>
              Save changes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(entry.body)
                setMode('read')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p
            id={bodyId}
            className={cn(
              'mt-2.5 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-text-muted',
              !expanded && 'line-clamp-3',
            )}
          >
            {entry.body}
          </p>

          {mode === 'confirming' ? (
            <div className="mt-3 rounded-xl bg-surface-muted p-3">
              <p className="text-sm text-text">
                Delete this entry? It is only on this device, so it cannot be recovered.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button size="sm" onClick={handleDelete}>
                  Yes, delete it
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setMode('read')}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={bodyId}
                onClick={() => setExpanded((open) => !open)}
                className="rounded-xs px-1 py-1 text-sm font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
              >
                {expanded ? 'Show less' : 'Read in full'}
                <span className="sr-only"> — entry from {describeDay(entry.date)}</span>
              </button>

              <span aria-hidden="true" className="px-1 text-text-subtle">
                ·
              </span>

              <Button
                variant="ghost"
                size="sm"
                iconLeft={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => {
                  setDraft(entry.body)
                  setMode('edit')
                }}
              >
                Edit
                <span className="sr-only"> entry from {describeDay(entry.date)}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                iconLeft={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => setMode('confirming')}
              >
                Delete
                <span className="sr-only"> entry from {describeDay(entry.date)}</span>
              </Button>
            </div>
          )}
        </>
      )}
    </li>
  )
}

export default JournalEntryItem
