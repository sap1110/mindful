import { Brain, ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'

interface Note {
  icon: typeof ClipboardCheck
  to: string
  title: string
  body: string
  /** The rule that shows the instrument is being followed, not just borrowed. */
  rule: string
}

const NOTES: readonly Note[] = [
  {
    icon: ClipboardCheck,
    to: '/self-check',
    title: 'Self-check',
    body: 'The PHQ-9 and the GAD-7, in full, scored on this device and attributed to the people who wrote them.',
    rule: 'The PHQ-9’s ninth item asks about thoughts of self-harm, and it is treated as a signal in its own right rather than nine points out of twenty-seven. Answer it above “not at all” and crisis support is rendered above the score, whatever the total came to.',
  },
  {
    icon: Brain,
    to: '/recovery',
    title: 'Recovery',
    body: 'Concussion symptom tracking and the graduated return-to-learn and return-to-sport ladders, with the CDC danger signs on the way in.',
    rule: 'The ladders follow the Amsterdam 2023 consensus, so the gates are enforced rather than suggested: a minimum of 24 hours at each stage, a return to your own symptom baseline before the stages that need it, and clinician clearance before the last one. The app will not let you skip a rung because you feel fine.',
  },
]

/**
 * The two clinical surfaces, and why each is more than a form.
 *
 * The interesting thing about both is a constraint rather than a feature, so
 * that is what this step leads with: a screening instrument implemented
 * without its safety rule is not the instrument, and a return-to-sport ladder
 * whose stages can be skipped is a picture of one.
 */
export function ClinicalNotes() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {NOTES.map(({ icon: Icon, to, title, body, rule }) => (
        <Card key={to} tone="sunken" padding="md" as="article">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon aria-hidden="true" className="h-4.5 w-4.5" />
          </span>

          <h3 className="mt-4 font-display text-xl text-text">{title}</h3>
          <p className="mt-2 text-text-muted">{body}</p>

          <p className="mt-4 rounded-2xl bg-surface p-4 text-sm text-text-muted shadow-soft">
            {rule}
          </p>

          <p className="mt-4">
            <Link
              to={to}
              className="rounded-xs text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
            >
              Open {title.toLowerCase()}
            </Link>
          </p>
        </Card>
      ))}
    </div>
  )
}

export default ClinicalNotes
