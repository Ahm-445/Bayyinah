import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { MY_QUESTIONS_KEY } from '../../question-history/hooks/useMyQuestions.js'
import QuestionForm from '../components/QuestionForm.jsx'
import { useSubmitQuestion } from '../hooks/useSubmitQuestion.js'

const STEPS = [
  'You ask a question about Islam.',
  'An AI assistant prepares a draft from approved sources only.',
  'Qualified dāʿīs review, correct and approve their answers.',
  'You compare their answers and choose the one that helped you most.',
]

/** Questioner dashboard main area: the ask box. */
export default function AskPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const submit = useSubmitQuestion()

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Ask a question about Islam</h1>
        <p className="mt-2 text-stone-600">
          Every answer is reviewed and approved by a qualified dāʿī before you see it.
        </p>
        <div className="mt-6">
          <QuestionForm
            submitting={submit.isPending}
            error={submit.error}
            onSubmit={(question) =>
              submit.mutate(question, {
                onSuccess: ({ id }) => {
                  queryClient.invalidateQueries({ queryKey: MY_QUESTIONS_KEY })
                  navigate(`/questions/${id}`, { state: { justSubmitted: true } })
                },
              })
            }
          />
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-700">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-stone-600">
          Bayyinah answers general questions. Requests for a personal religious ruling (fatwa) are
          referred to a scholar.
        </p>
      </section>
    </div>
  )
}
