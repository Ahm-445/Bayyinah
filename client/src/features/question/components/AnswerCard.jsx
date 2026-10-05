import { useI18n } from '../../../i18n/core.js'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'

/**
 * A published answer as the questioner sees it: the dāʿī's text only.
 * No sources list, source count or verification status; the dāʿī mentions
 * sources inside the text. The text keeps its own language (dir="auto").
 */
export default function AnswerCard({ answer, index, showNumber, selected, canSelect, onSelect }) {
  const { t, locale } = useI18n()
  return (
    <article
      className={`flex flex-col rounded-lg border bg-white p-5 ${
        selected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-stone-200'
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {showNumber && <h3 className="font-semibold">{t('answers.answerN', { n: index + 1 })}</h3>}
          <p className="text-sm text-stone-600">{t('answers.by', { name: answer.daee.displayName })}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20 ring-inset">
          {t('answers.approved')}
        </span>
      </header>

      <p dir="auto" className="mt-4 flex-1 leading-relaxed whitespace-pre-wrap text-stone-800">
        {answer.finalText}
      </p>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
        <span className="text-xs text-stone-500" title={fullDate(answer.publishedAt, locale)}>
          {answer.publishedAt && t('answers.published', { time: timeAgo(answer.publishedAt, { locale }) })}
        </span>
        {selected ? (
          <span className="rounded bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-800">
            {t('answers.yourChoice')}
          </span>
        ) : (
          canSelect && (
            <button
              type="button"
              onClick={() => onSelect(answer)}
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              {t('answers.select')}
            </button>
          )
        )}
      </footer>
    </article>
  )
}
