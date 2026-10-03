import { NavLink } from 'react-router'
import QueryState from '../../../shared/components/QueryState.jsx'
import { QUESTION_STATUS_LABEL } from '../../../shared/lib/enums.js'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'
import { useMyQuestions } from '../hooks/useMyQuestions.js'

const TONE = {
  neutral: 'bg-stone-100 text-stone-700',
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
}

function StatusChip({ status }) {
  const { label, tone } = QUESTION_STATUS_LABEL[status] ?? { label: status, tone: 'neutral' }
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TONE[tone]}`}>{label}</span>
}

/** Sidebar: the questioner's previous questions, newest first, with status. */
export default function QuestionHistory() {
  const query = useMyQuestions()

  return (
    <nav aria-labelledby="question-history-heading" className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 id="question-history-heading" className="font-semibold">
        Your questions
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
                        `block rounded px-2 py-2 hover:bg-stone-50 ${isActive ? 'bg-emerald-50 ring-1 ring-emerald-600/20' : ''}`
                      }
                    >
                      <span dir="auto" lang={q.language} className="line-clamp-2 text-sm text-stone-900">
                        {q.text}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <StatusChip status={q.status} />
                        <span className="text-xs text-stone-500" title={fullDate(q.createdAt)}>
                          {timeAgo(q.createdAt)}
                        </span>
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-600">No questions yet. Ask your first one.</p>
            )
          }
        </QueryState>
      </div>
    </nav>
  )
}
