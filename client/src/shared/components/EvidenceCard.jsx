import { useI18n } from '../../i18n/core.js'
import { textDirProps } from '../lib/text.js'

/**
 * Evidence card: the reference, the hadith grade for hadith evidence, and the source text.
 * Arabic source text renders RTL in the Qur'an font (Amiri); anything else
 * uses dir="auto". Independent of the UI language.
 * `evidence` is a mapped evidence item (services/mappers/common.js).
 */
export default function EvidenceCard({ evidence, cited = false, action = null }) {
  const { t } = useI18n()
  const textProps = textDirProps(evidence.text)
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
        {evidence.reference ? (
          <span {...textDirProps(evidence.reference)} className="text-sm font-semibold text-brand">
            {evidence.reference}
          </span>
        ) : (
          <span dir="ltr">{evidence.chunkId}</span>
        )}
        <span className="flex items-center gap-1.5">
          {evidence.hadithGrade && (
            <span className="chip bg-ceramic text-ink-soft">
              {t('review.hadithGrade', { grade: evidence.hadithGrade })}
            </span>
          )}
          {cited && (
            <span className="chip bg-mint text-brand">
              {t('review.cited')}
            </span>
          )}
        </span>
      </div>
      <p
        {...textProps}
        className={`mt-2 whitespace-pre-line text-ink ${
          textProps.lang === 'ar' ? 'font-quran text-xl leading-loose' : 'text-base leading-relaxed'
        }`}
      >
        {evidence.text}
      </p>
      {action && <div className="mt-4 border-t border-black/10 pt-3">{action}</div>}
    </article>
  )
}
