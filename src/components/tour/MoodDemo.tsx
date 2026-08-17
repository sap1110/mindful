import { useState } from 'react'
import { MOOD_LEVELS } from '../../lib/mood'
import type { MoodScore } from '../../lib/storage'
import { MoodScale } from '../mood/MoodScale'
import { Card } from '../ui/Card'

/**
 * The check-in, working, saving nothing.
 *
 * The real component, not a picture of it — so the arrow keys move between
 * levels here exactly as they do on the check-in screen, and anything that
 * breaks there breaks here in front of a visitor. The only thing missing is
 * the call to storage.
 */
export function MoodDemo() {
  const [score, setScore] = useState<MoodScore | null>(null)
  const level = MOOD_LEVELS.find((entry) => entry.score === score)

  return (
    <Card tone="sunken" padding="md">
      <MoodScale value={score} onChange={setScore} legend="How is today going?" />

      <p aria-live="polite" className="mt-4 min-h-[1.5rem] text-sm text-text-muted">
        {level
          ? `“${level.label}” — on the real screen that is now saved, and you could add a word about why. Nothing was saved here.`
          : 'Pick one to see what happens next.'}
      </p>
    </Card>
  )
}

export default MoodDemo
