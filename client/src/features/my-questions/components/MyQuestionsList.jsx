import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { clearSession } from '../../../services/session.js'
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'
import { useMyQuestions } from '../hooks/useMyQuestions.js'

export default function MyQuestionsList() {
  const questions = useMyQuestions()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  if (!questions.length) return null

  function forget() {
    clearSession()
    queryClient.removeQueries({ queryKey: ['questions'] })
    setConfirming(false)
  }

  return (
    <section aria-labelledby="my-questions-heading" className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="my-questions-heading" className="font-semibold">
          My questions
        </h2>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs text-stone-500 underline hover:text-stone-800"
        >
          Forget
        </button>
      </div>
      <ul className="mt-3 divide-y divide-stone-100">
        {questions.map((q) => (
          <li key={q.id} className="py-2">
            <Link to={`/questions/${q.id}`} dir="auto" className="line-clamp-2 text-sm text-emerald-800 hover:underline">
              {q.text}
            </Link>
            <span className="text-xs text-stone-500" title={fullDate(q.askedAt)}>
              {timeAgo(q.askedAt)}
            </span>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirming}
        title="Forget my questions?"
        confirmLabel="Forget"
        onConfirm={forget}
        onCancel={() => setConfirming(false)}
      >
        This clears the list and starts a new session in this browser. You will not be able to
        open these questions again, even with a saved link.
      </ConfirmDialog>
    </section>
  )
}
