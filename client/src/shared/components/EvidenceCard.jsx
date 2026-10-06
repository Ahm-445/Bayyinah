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
    <article className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
        {evidence.reference ? (
          <span {...textDirProps(evidence.reference)} className="text-sm text-stone-700">
            {evidence.reference}
          </span>
        ) : (
          <span dir="ltr">{evidence.chunkId}</span>
        )}
        <span className="flex items-center gap-1.5">
          {evidence.hadithGrade && (
            <span className="rounded bg-sky-50 px-1.5 py-0.5 font-medium text-sky-800">
              {t('review.hadithGrade', { grade: evidence.hadithGrade })}
            </span>
          )}
          {cited && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
              {t('review.cited')}
            </span>
          )}
        </span>
      </div>
      <p
        {...textProps}
        className={`mt-2 whitespace-pre-line text-stone-900 ${
          textProps.lang === 'ar' ? 'font-quran text-xl leading-loose' : 'text-base leading-relaxed'
        }`}
      >
        {evidence.text}
      </p>
      {action && <div className="mt-3 border-t border-stone-100 pt-2">{action}</div>}
    </article>
  )
}
