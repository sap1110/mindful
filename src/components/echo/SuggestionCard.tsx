import { ExternalLink } from 'lucide-react'
import { librarySource, type LibraryCard } from '../../lib/companion/library'
import { Card } from '../ui/Card'

export interface SuggestionCardProps {
  card: LibraryCard
  className?: string
}

/**
 * One thing worth trying, from a body that is qualified to suggest it.
 *
 * The attribution is not fine print here, it is the point: Mindful makes no
 * health claims of its own, so every card names its source in the body copy and
 * again in the footer with a link. Someone should be able to leave and read the
 * original, and nothing should read as though the app itself is the authority.
 *
 * Note the absence of any "recommended for you" framing. These are retrieved by
 * similarity, not prescribed, and dressing a nearest-neighbour lookup up as
 * personalised medical guidance would be exactly the overreach the rest of this
 * codebase avoids.
 */
export function SuggestionCard({ card, className }: SuggestionCardProps) {
  const source = librarySource(card)

  return (
    <Card tone="sunken" padding="md" as="article" className={className}>
      <h3 className="font-display text-xl text-text">{card.title}</h3>

      <p className="mt-2.5 max-w-prose text-text-muted">{card.body}</p>

      {card.quote ? (
        <blockquote className="mt-3.5 border-l-2 border-border-strong pl-3.5">
          <p className="max-w-prose text-sm italic text-text-muted">“{card.quote}”</p>
        </blockquote>
      ) : null}

      <p className="mt-4 text-xs text-text-subtle">
        Source:{' '}
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/35 underline-offset-2 hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {source.name}
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </p>
    </Card>
  )
}

export default SuggestionCard
