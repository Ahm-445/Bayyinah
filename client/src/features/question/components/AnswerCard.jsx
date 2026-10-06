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
      className={`flex flex-col rounded-card p-5 sm:p-6 ${
        // Gold marks the chosen answer, and nothing else in the interface.
        selected ? 'bg-gold-wash ring-2 ring-gold' : 'bg-white shadow-card'
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {showNumber && <h3 className="font-semibold">{t('answers.answerN', { n: index + 1 })}</h3>}
          <p className="text-sm text-ink-soft">{t('answers.by', { name: answer.daee.displayName })}</p>
        </div>
        <span className="chip bg-mint text-brand">
          {t('answers.approved')}
        </span>
      </header>

      <p dir="auto" className="mt-4 flex-1 leading-relaxed whitespace-pre-wrap text-ink">
        {answer.finalText}
      </p>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
        <span className="text-xs text-ink-soft" title={fullDate(answer.publishedAt, locale)}>
          {answer.publishedAt && t('answers.published', { time: timeAgo(answer.publishedAt, { locale }) })}
        </span>
        {selected ? (
          <span className="chip bg-gold px-3 py-1 text-sm text-house">
            {t('answers.yourChoice')}
          </span>
        ) : (
          canSelect && (
            <button
              type="button"
              onClick={() => onSelect(answer)}
              className="btn btn-primary"
            >
              {t('answers.select')}
            </button>
          )
        )}
      </footer>
    </article>
  )
}
