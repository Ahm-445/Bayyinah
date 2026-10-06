import { useI18n } from '../../../i18n/core.js'
import VerificationBadge from '../../../shared/components/VerificationBadge.jsx'

function Check({ ok, children }) {
  const { t } = useI18n()
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={ok ? 'text-accent' : 'text-danger'}>
        {ok ? '✓' : '✗'}
      </span>
      <span>{children}</span>
      <span className="sr-only">{ok ? t('verification.passed') : t('verification.failed')}</span>
    </li>
  )
}

function Findings({ title, items, tone }) {
  if (!items.length) return null
  return (
    <div>
      <h4 className="eyebrow text-ink-soft">{title}</h4>
      <ul className={`mt-1 list-disc space-y-1 ps-5 text-sm ${tone}`}>
        {items.map((item) => (
          <li key={item} dir="auto">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Shown only when there is an AI draft (the review page hides it otherwise). */
export default function VerificationPanel({ verification }) {
  const { t } = useI18n()
  return (
    <section aria-labelledby="verification-heading" className="card p-5">
      <div className="flex items-start justify-between gap-2">
        <h2 id="verification-heading" className="text-xl">
          {t('verification.title')}
        </h2>
        <div className="flex flex-col items-end gap-1">
          <VerificationBadge status={verification?.status} />
          <span className="text-xs text-ink-soft">{t('verification.appliesOriginal')}</span>
        </div>
      </div>

      {verification ? (
        <div className="mt-3 space-y-3">
          <ul className="space-y-1 text-sm">
            <Check ok={verification.citationValid}>{t('verification.citationsMatch')}</Check>
            <Check ok={verification.evidenceSupported}>{t('verification.evidenceSupports')}</Check>
          </ul>
          <Findings title={t('verification.warnings')} items={verification.warnings} tone="text-amber-800" />
          <Findings title={t('verification.unsupported')} items={verification.unsupportedClaims} tone="text-danger" />
          <Findings title={t('verification.missing')} items={verification.missingCitations} tone="text-danger" />
          <Findings title={t('verification.riskFlags')} items={verification.riskFlags} tone="text-danger" />
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{t('verification.noDraft')}</p>
      )}
    </section>
  )
}
