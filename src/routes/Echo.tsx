import { motion } from 'framer-motion'
import { Loader2, Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { AppNav } from '../components/AppNav'
import { CrisisResources } from '../components/crisis/CrisisResources'
import { PageShell } from '../components/PageShell'
import { ConsentGate } from '../components/echo/ConsentGate'
import { MatchCard } from '../components/echo/MatchCard'
import { SuggestionCard } from '../components/echo/SuggestionCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextArea } from '../components/ui/TextArea'
import { useReflection } from '../hooks/useReflection'
import { ACUTE_BODY, ACUTE_HEADING } from '../lib/companion/safety'
import { staggerChild, staggerParent } from '../lib/motion'

const PLACEHOLDER = 'Everything feels like too much today and I cannot work out why.'

/**
 * Look back — semantic search across the person's own history.
 *
 * The claim this screen makes is narrow on purpose: *you have written something
 * like this before, here it is, and here is what the following fortnight looked
 * like.* Every part of that is evidence rather than interpretation. Nothing on
 * this page is generated; the model turns text into vectors and that is all it
 * does.
 *
 * Ordering is the safety design again. A risk assessment runs on the input
 * before any search happens, and an acute signal replaces the results entirely
 * rather than appearing alongside them — someone who has just said they want to
 * die should not be handed a list of their old diary entries with a helpline
 * underneath.
 */
export function Echo() {
  const { status, ready, enable, ask, reflection, thinking, clear, passageCount } = useReflection()
  const [draft, setDraft] = useState('')
  const resultsRef = useRef<HTMLDivElement>(null)

  async function handleAsk() {
    if (draft.trim().length === 0) return
    await ask(draft)
    // Move focus to the answer, which is below the fold on a phone.
    window.requestAnimationFrame(() => resultsRef.current?.focus())
  }

  const acute = reflection?.risk.level === 'acute'

  return (
    <PageShell nav={<AppNav />} disclaimer="panel">
      <motion.div variants={staggerParent} initial="hidden" animate="visible">
        <motion.p
          variants={staggerChild}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
        >
          Echo
        </motion.p>

        <motion.h1
          variants={staggerChild}
          className="mt-3 max-w-prose text-display-xs text-text sm:text-display-sm"
        >
          Have you been here before?
        </motion.h1>

        <motion.p variants={staggerChild} className="mt-4 max-w-prose text-lg text-text-muted">
          Describe how things are right now, in your own words. Mindful will search what you have
          already written for the times that read like this one — and show you what the fortnight
          after each of them looked like.
        </motion.p>

        <motion.div variants={staggerChild} className="mt-8">
          <div>
            <TextArea
              label="How are things right now?"
              hint="This is read on your device and never sent anywhere."
              placeholder={PLACEHOLDER}
              value={draft}
              rows={4}
              onChange={(event) => setDraft(event.target.value)}
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={handleAsk}
                disabled={thinking || draft.trim().length === 0}
                iconLeft={
                  thinking ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )
                }
              >
                {thinking ? 'Looking…' : 'Look back'}
              </Button>

              {reflection ? (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    clear()
                    setDraft('')
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>

            <p className="mt-3 text-sm text-text-subtle" aria-live="polite">
              {passageCount === 0
                ? 'Nothing of your own to search yet — suggestions below come from published guidance.'
                : `${passageCount} of your own entries are searchable.`}
            </p>
          </div>

          {/*
            The download is an upgrade, never a gate. Echo answers by word
            overlap out of the box; the model makes it able to match meaning
            rather than vocabulary. Someone who declines still has the feature.
          */}
          {ready ? null : (
            <div className="mt-8">
              <ConsentGate status={status} onEnable={enable} />
            </div>
          )}
        </motion.div>

        {/* ------------------------------------------------------------ results */}

        <div
          ref={resultsRef}
          tabIndex={-1}
          className="scroll-mt-8 focus:outline-none"
          aria-live="polite"
        >
          {acute && reflection ? (
            <div className="mt-10">
              <Card tone="raised" padding="lg" className="border-accent/50 bg-accent-soft/45">
                <h2 className="font-display text-2xl text-text">{ACUTE_HEADING}</h2>
                {ACUTE_BODY.map((line) => (
                  <p key={line} className="mt-3 max-w-prose text-text-muted">
                    {line}
                  </p>
                ))}
              </Card>

              <CrisisResources className="mt-6" tone="urgent" heading="Please talk to someone" />
            </div>
          ) : null}

          {!acute && reflection?.result ? (
            <div className="mt-10">
              <h2 className="font-display text-2xl text-text">{reflection.summary}</h2>

              {/*
                Named rather than implied. A keyword pass that found nothing is
                weak evidence of absence, and letting someone read it as "I have
                never felt this way before" would be the app overstating itself.
              */}
              <p className="mt-2 text-sm text-text-subtle">
                {reflection.mode === 'semantic'
                  ? 'Matched by meaning, on this device.'
                  : 'Matched on the words you used, not their meaning — entries that put it differently will not have surfaced.'}
              </p>

              {reflection.result.personal.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {reflection.result.personal.map((match) => (
                    <MatchCard key={match.passage.id} match={match} />
                  ))}
                </div>
              ) : null}

              {reflection.result.library.length > 0 ? (
                <section aria-labelledby="suggestions-heading" className="mt-10">
                  <h3
                    id="suggestions-heading"
                    className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle"
                  >
                    {reflection.result.personal.length > 0
                      ? 'Also, from published guidance'
                      : 'From published guidance'}
                  </h3>
                  <p className="mt-2 max-w-prose text-sm text-text-muted">
                    Mindful does not give health advice of its own. These are things other people
                    have found useful, from bodies qualified to suggest them — each one says who,
                    and links to the original.
                  </p>
                  <div className="mt-4 space-y-4">
                    {reflection.result.library.map((match) => (
                      <SuggestionCard key={match.card.id} card={match.card} />
                    ))}
                  </div>
                </section>
              ) : null}

              {reflection.risk.level === 'concern' ? (
                <CrisisResources className="mt-10" />
              ) : null}
            </div>
          ) : null}
        </div>
      </motion.div>
    </PageShell>
  )
}

export default Echo
