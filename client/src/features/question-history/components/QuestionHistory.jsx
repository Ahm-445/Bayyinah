import { NavLink } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import QueryState from '../../../shared/components/QueryState.jsx'
import { QUESTION_STATUS_TONE } from '../../../shared/lib/enums.js'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'
import { useMyQuestions } from '../hooks/useMyQuestions.js'

const TONE = {
  neutral: 'bg-ceramic text-ink-soft',
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-mint text-brand',
  danger: 'bg-danger/10 text-danger',
}

function StatusChip({ status }) {
  const { t } = useI18n()
  const tone = QUESTION_STATUS_TONE[status] ?? 'neutral'
  return (
    <span className={`chip ${TONE[tone]}`}>
      {t(`questionStatus.${status}`, { defaultValue: status })}
    </span>
  )
}

/** Sidebar: the questioner's previous questions, newest first, with status. */
export default function QuestionHistory() {
  const { t, locale } = useI18n()
  const query = useMyQuestions()

  return (
    <nav aria-labelledby="question-history-heading" className="card p-5">
      <h2 id="question-history-heading" className="font-semibold">
        {t('history.title')}
      </h2>
      <div className="mt-3">
        <QueryState query={query}>
          {(questions) =>
            questions.length ? (
              <ul className="-mx-2 space-y-1">
                {questions.map((q) => (
                  <li key={q.id}>
                    <NavLink
                      to={`/questions/${q.id}`}
                      className={({ isActive }) =>
                        `block rounded-lg px-2 py-2.5 hover:bg-canvas ${isActive ? 'bg-mint/50' : ''}`
                      }
                    >
                      {/* Question text keeps its own language/direction. */}
                      <span dir="auto" lang={q.language} className="line-clamp-2 text-sm text-ink">
                        {q.text}
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <StatusChip status={q.status} />
                        <span className="text-xs text-ink-soft" title={fullDate(q.createdAt, locale)}>
                          {timeAgo(q.createdAt, { locale })}
                        </span>
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">{t('history.empty')}</p>
            )
          }
        </QueryState>
      </div>
    </nav>
  )
}
