import { motion } from 'framer-motion'
import { BookOpen, ClipboardList, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppNav } from '../components/AppNav'
import { DangerSigns } from '../components/concussion/DangerSigns'
import { ProtocolTracker } from '../components/concussion/ProtocolTracker'
import { SymptomCheckForm } from '../components/concussion/SymptomCheckForm'
import { PageShell } from '../components/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useMindfulData } from '../hooks/useMindfulData'
import {
  GUIDANCE,
  GUIDANCE_CHECKED,
  LIMITATIONS,
  evidenceSource,
} from '../lib/concussion/evidence'
import type { ProtocolState } from '../lib/concussion/protocol'
import {
  MAX_TOTAL_SEVERITY,
  describeChange,
  reviewTrend,
  scoreSymptoms,
} from '../lib/concussion/symptoms'
import { describeDay, formatLongDay, todayISO } from '../lib/date'
import { staggerChild, staggerParent } from '../lib/motion'
import { clearProtocol, readProtocol, saveProtocol, saveSymptomCheck } from '../lib/storage'

/**
 * Recovery — concussion, tracked the way the guidelines say to.
 *
 * Mindful is a self-care companion, and the honest version of a concussion
 * feature is not a diagnosis engine. It is the three things a person recovering
 * from a head injury actually needs and rarely has: the danger signs in front
 * of them, a symptom record worth taking to an appointment, and a graduated
 * return plan that will not let them skip a stage because they feel fine today.
 *
 * The screen is ordered by consequence rather than by workflow. Danger signs
 * are first, before the tracking, before the tools, because an epidural
 * haematoma does not wait for someone to finish a questionnaire. Then the
 * record. Then the ladder. Then what the evidence says, each line naming who
 * said it. Then, last but not least-important, what this cannot do — including
 * the two sentences the whole feature is built around: it does not diagnose,
 * and it never clears anyone to play.
 *
 * The connections to the rest of the app are real rather than cross-promotion.
 * Sleep and mood are among the strongest predictors of a slow recovery and
 * Mindful already tracks both; light sensitivity makes screens unusable, and
 * the breathing session already runs with the screen dark and a voice leading
 * it. A concussion feature that ignored the mental-health app it is sitting
 * inside would be missing the point of putting it here.
 */
export function Recovery() {
  const { concussion } = useMindfulData()
  const [protocol, setProtocol] = useState<ProtocolState | null>(() => readProtocol())
  const [checking, setChecking] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const today = todayISO()
  const latest = concussion[0]
  const todayCheck = latest?.date === today ? latest : undefined
  const previous = todayCheck ? concussion[1] : latest
  const trend = reviewTrend(concussion, today)

  function handleSave(answers: Record<string, number>) {
    const score = scoreSymptoms(answers)
    saveSymptomCheck({ date: today, answers, severity: score.severity, count: score.count })
    setChecking(false)
    setAnnouncement(
      `Symptom check saved — ${score.count} of 22 symptoms, total ${score.severity} of ${MAX_TOTAL_SEVERITY}.`,
    )
  }

  function handleProtocol(next: ProtocolState) {
    setProtocol(next)
    saveProtocol(next)
  }

  function handleStopProtocol() {
    setProtocol(null)
    clearProtocol()
  }

  return (
    <PageShell nav={<AppNav />} disclaimer="panel">
      <motion.div variants={staggerParent} initial="hidden" animate="visible">
        <motion.p
          variants={staggerChild}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary"
        >
          Recovery
        </motion.p>

        <motion.h1
          variants={staggerChild}
          className="mt-3 max-w-prose text-display-xs text-text sm:text-display-sm"
        >
          After a concussion
        </motion.h1>

        <motion.p variants={staggerChild} className="mt-4 max-w-prose text-lg text-text-muted">
          A record to take to your appointment, and a return plan that paces you the way the
          published guidance says to. It does not diagnose anything and it will never tell you that
          you are ready to play — that is a clinician&rsquo;s call, and it stays theirs.
        </motion.p>

        {/* -------------------------------------------------------- danger signs */}

        <motion.div variants={staggerChild}>
          <DangerSigns className="mt-8" />
        </motion.div>

        {/* ------------------------------------------------------ symptom record */}

        <motion.section variants={staggerChild} className="mt-10" aria-labelledby="symptoms-heading">
          <h2
            id="symptoms-heading"
            className="flex items-center gap-2 font-display text-2xl text-text"
          >
            <ClipboardList aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            Today&rsquo;s symptoms
          </h2>

          <p className="mt-2 max-w-prose text-text-muted">
            The 22-symptom check used in concussion care, rated 0 to 6. One number on one day says
            very little; the same 22 every day for three weeks is the thing that shows whether you
            are recovering, and the thing nobody can reconstruct from memory in a ten-minute
            appointment.
          </p>

          <div className="mt-5">
            {checking ? (
              <Card tone="raised" padding="md">
                <SymptomCheckForm
                  initial={todayCheck?.answers}
                  onSave={handleSave}
                  onCancel={() => setChecking(false)}
                />
              </Card>
            ) : (
              <Card tone="raised" padding="md">
                {latest ? (
                  <>
                    <p className="text-text">
                      <span className="font-display text-display-xs text-primary">
                        {latest.severity}
                      </span>
                      <span className="text-text-muted"> of {MAX_TOTAL_SEVERITY}</span>
                      <span className="text-text-muted">
                        {' '}
                        · {latest.count} of 22 symptoms present
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-text-subtle">
                      {todayCheck
                        ? `Checked today, ${formatLongDay(latest.date)}.`
                        : `Last checked ${describeDay(latest.date)}.`}
                    </p>
                    <p className="mt-3 text-text-muted">
                      {describeChange(latest.severity, previous?.severity ?? null)}
                    </p>
                  </>
                ) : (
                  <p className="max-w-prose text-text-muted">
                    Nothing recorded yet. The first check becomes the line everything after it is
                    compared against, so it is worth doing even on a day that feels unremarkable.
                  </p>
                )}

                <div className="mt-5">
                  <Button size="lg" onClick={() => setChecking(true)}>
                    {todayCheck ? 'Update today’s check' : 'Check my symptoms'}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <p role="status" aria-live="polite" className="mt-3 min-h-[1.25rem] text-sm text-success">
            {announcement}
          </p>

          {trend.worsening || trend.persisting ? (
            <Card tone="raised" padding="md" className="mt-4 border-accent/50 bg-accent-soft/40">
              <p className="flex items-start gap-2.5 text-text">
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-accent-hover"
                />
                <span className="max-w-prose">
                  {trend.worsening
                    ? 'Your total has gone up noticeably since your last check. Symptoms getting worse rather than better is a reason to be seen, not a reason to rest harder and hope.'
                    : 'You have been recording symptoms for four weeks or more. Symptoms lasting this long are common and have a name — persisting symptoms after concussion — and they are treatable. This is the point to ask for an assessment if you have not had one.'}
                </span>
              </p>
            </Card>
          ) : null}

          {concussion.length > 1 ? (
            <div className="mt-6">
              <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
                Recent checks
              </h3>
              <ul className="mt-3 space-y-2">
                {concussion.slice(0, 7).map((check) => (
                  <li
                    key={check.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm shadow-soft"
                  >
                    <span className="font-medium text-text">{describeDay(check.date)}</span>
                    <span className="text-text-muted">
                      {check.severity} of {MAX_TOTAL_SEVERITY} · {check.count} symptoms
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </motion.section>

        {/* ------------------------------------------------------------- protocol */}

        <motion.section variants={staggerChild} className="mt-12" aria-labelledby="protocol-heading">
          <h2
            id="protocol-heading"
            className="flex items-center gap-2 font-display text-2xl text-text"
          >
            <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            Your return plan
          </h2>

          <p className="mt-2 max-w-prose text-text-muted">
            A stage at a time, at least 24 hours each, with going backwards treated as a normal part
            of the process rather than a failure.
          </p>

          <div className="mt-5">
            <ProtocolTracker
              state={protocol}
              onChange={handleProtocol}
              onStop={handleStopProtocol}
            />
          </div>
        </motion.section>

        {/* ------------------------------------------------------------- evidence */}

        <motion.section variants={staggerChild} className="mt-12" aria-labelledby="evidence-heading">
          <h2 id="evidence-heading" className="font-display text-2xl text-text">
            What the guidance actually says
          </h2>

          <p className="mt-2 max-w-prose text-text-muted">
            Mindful makes no health claims of its own. Every line here names who said it and links
            to them. Checked on {formatLongDay(GUIDANCE_CHECKED)}; guidance changes, so treat an old
            copy of this app with suspicion.
          </p>

          <div className="mt-5 space-y-4">
            {GUIDANCE.map((item) => {
              const source = evidenceSource(item.sourceId)
              return (
                <Card key={item.id} padding="md" as="article">
                  <h3 className="font-sans text-lg font-medium text-text">{item.title}</h3>
                  <p className="mt-2 max-w-prose text-text-muted">{item.body}</p>
                  <p className="mt-3 text-sm text-text-subtle">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                    >
                      {source.name}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    {' — '}
                    {source.what}
                  </p>
                  {item.inApp ? (
                    <p className="mt-3">
                      <Link
                        to={item.inApp.to}
                        className="rounded-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                      >
                        {item.inApp.label}
                      </Link>
                    </p>
                  ) : null}
                </Card>
              )
            })}
          </div>
        </motion.section>

        {/* ---------------------------------------------------------- limitations */}

        <motion.section
          variants={staggerChild}
          className="mt-12"
          aria-labelledby="limitations-heading"
        >
          <Card tone="sunken" padding="md">
            <h2 id="limitations-heading" className="font-sans text-lg font-medium text-text">
              What this cannot do
            </h2>
            <ul className="mt-3 space-y-2 text-text-muted">
              {LIMITATIONS.map((limitation) => (
                <li key={limitation} className="flex gap-2.5">
                  <span aria-hidden="true" className="select-none text-text-subtle">
                    ·
                  </span>
                  <span className="max-w-prose">{limitation}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.section>
      </motion.div>
    </PageShell>
  )
}

export default Recovery
