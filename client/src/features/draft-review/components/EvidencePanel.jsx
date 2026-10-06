import { useI18n } from '../../../i18n/core.js'
import EvidenceCard from '../../../shared/components/EvidenceCard.jsx'

/**
 * `isCited(item)`: whether the current text mentions this evidence (live).
 * `onInsert`: when set, each card offers "Insert citation".
 */
export default function EvidencePanel({ evidence, isCited = () => false, onInsert }) {
  const { t } = useI18n()
  return (
    <section aria-labelledby="evidence-heading">
      <h2 id="evidence-heading" className="text-xl">
        {t('review.evidence')} <span className="font-normal text-ink-soft">({evidence.length})</span>
      </h2>
      {evidence.length ? (
        <div className="mt-3 space-y-3">
          {evidence.map((item) => (
            <EvidenceCard
              key={item.key}
              evidence={item}
              cited={isCited(item)}
              action={
                onInsert && (
                  <button
                    type="button"
                    onClick={() => onInsert(item)}
                    className="text-sm font-semibold text-accent hover:text-brand hover:underline"
                  >
                    {t('review.insert')}
                  </button>
                )
              }
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{t('review.noEvidence')}</p>
      )}
    </section>
  )
}
