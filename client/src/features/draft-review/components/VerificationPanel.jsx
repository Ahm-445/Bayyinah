import VerificationBadge from '../../../shared/components/VerificationBadge.jsx'

function Check({ ok, children }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={ok ? 'text-emerald-600' : 'text-red-600'}>
        {ok ? '✓' : '✗'}
      </span>
      <span>{children}</span>
      <span className="sr-only">{ok ? 'passed' : 'failed'}</span>
    </li>
  )
}

function Findings({ title, items, tone }) {
  if (!items.length) return null
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{title}</h4>
      <ul className={`mt-1 list-disc space-y-1 pl-5 text-sm ${tone}`}>
        {items.map((item) => (
          <li key={item} dir="auto">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function VerificationPanel({ verification }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">Verification</h2>
        <div className="flex flex-col items-end gap-1">
          <VerificationBadge status={verification?.status} />
          <span className="text-xs text-stone-500">Applies to the original AI draft</span>
        </div>
      </div>

      {verification ? (
        <div className="mt-3 space-y-3">
          <ul className="space-y-1 text-sm">
            <Check ok={verification.citationValid}>Citations match retrieved sources</Check>
            <Check ok={verification.evidenceSupported}>Evidence supports the draft</Check>
          </ul>
          <Findings title="Warnings" items={verification.warnings} tone="text-amber-800" />
          <Findings title="Unsupported claims" items={verification.unsupportedClaims} tone="text-red-800" />
          <Findings
            title="Citations not in retrieved evidence"
            items={verification.missingCitations}
            tone="text-red-800"
          />
          <Findings title="Risk flags" items={verification.riskFlags} tone="text-red-800" />
        </div>
      ) : (
        <p className="mt-2 text-sm text-stone-600">No draft was generated, so nothing was verified.</p>
      )}
    </section>
  )
}
