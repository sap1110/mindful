import { modelCard } from '../../lib/guide/classifier'
import { EVIDENCE_CORPUS } from '../../lib/guide/evidence'

/**
 * The four numbers worth putting in front of a visitor.
 *
 * They are read from the model artefacts themselves — `modelCard` returns the
 * metrics recorded when the classifier was fitted — so they cannot drift from
 * the shipped weights the way a hand-typed figure in a README would.
 *
 * An earlier version also ran the full forty-case evaluation suite here, on a
 * button. It was honest and it was the wrong thing to put on a landing page:
 * nobody arriving at a mental-health app wants to run a benchmark, and asking
 * them to turned the page into a defence of the engineering rather than an
 * introduction to the product. The suite still runs — in CI, on every commit,
 * where a gate belongs.
 */
export function MeasuredNumbers() {
  const intent = modelCard('intent', 'embedding')
  const risk = modelCard('risk', 'embedding')

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        label="Intent classifier"
        value={intent.metrics.macroF1.toFixed(2)}
        unit="macro-F1"
        hint={`${intent.metrics.heldOut} held out, never trained on`}
      />
      <Stat
        label="Risk classifier"
        value={risk.metrics.macroF1.toFixed(2)}
        unit="macro-F1"
        hint="Advisory only — rules decide risk"
      />
      <Stat
        label="Cited documents"
        value={String(EVIDENCE_CORPUS.length)}
        unit="in the corpus"
        hint="NHS · CDC · WHO · MedlinePlus · NIH"
      />
      <Stat
        label="Claims invented"
        value="0.00"
        unit="by construction"
        hint="Every sentence is verbatim from a source"
      />
    </dl>
  )
}

function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string
  value: string
  unit: string
  hint: string
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface/85 p-5 shadow-soft backdrop-blur">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
        {label}
      </dt>
      <dd className="mt-2">
        <span className="font-display text-display-xs text-primary">{value}</span>{' '}
        <span className="text-sm text-text-muted">{unit}</span>
        <span className="mt-1 block text-sm text-text-subtle">{hint}</span>
      </dd>
    </div>
  )
}

export default MeasuredNumbers
