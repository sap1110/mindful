import { NotebookPen, Smile } from 'lucide-react'
import { cn } from '../../lib/cn'
import { describePassageDay } from '../../lib/echo/corpus'
import { describeTrajectory, type PersonalMatch } from '../../lib/echo/retrieve'
import { Card } from '../ui/Card'

export interface MatchCardProps {
  match: PersonalMatch
  className?: string
}

/**
 * One moment from the person's own history.
 *
 * The excerpt is shown verbatim, in a serif, as a quotation — because it is
 * one. Nothing on this card is paraphrased or summarised: the whole value of
 * the feature is that these are the person's actual words rather than a
 * machine's account of them, and rewriting them would throw that away.
 *
 * The trajectory line underneath is the part that does the work, and it is
 * allowed to deliver bad news. See `readTrajectory` for why a stretch that got
 * worse is reported plainly instead of being softened into encouragement.
 */
export function MatchCard({ match, className }: MatchCardProps) {
  const { passage, trajectory } = match
  const Icon = passage.source === 'journal' ? NotebookPen : Smile
  const harder = trajectory.direction === 'harder'

  return (
    <Card tone="raised" padding="md" as="article" className={className}>
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.06em] text-text-subtle">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {passage.source === 'journal' ? 'From your journal' : 'From a check-in note'}
      </p>

      <blockquote className="mt-3 border-l-2 border-primary/35 pl-4">
        <p className="font-display text-lg leading-relaxed text-text">{passage.text}</p>
        <footer className="mt-2.5 text-sm text-text-subtle">
          <cite className="not-italic">{describePassageDay(passage)}</cite>
        </footer>
      </blockquote>

      <p
        className={cn(
          'mt-4 rounded-2xl p-3.5 text-sm',
          harder ? 'bg-accent-soft/55 text-text' : 'bg-surface-muted text-text-muted',
        )}
      >
        {describeTrajectory(trajectory)}
      </p>
    </Card>
  )
}

export default MatchCard
