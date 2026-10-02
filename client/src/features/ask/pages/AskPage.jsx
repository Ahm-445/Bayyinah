import { useNavigate } from 'react-router'
import QuestionForm from '../components/QuestionForm.jsx'
import { useSubmitQuestion } from '../hooks/useSubmitQuestion.js'

const STEPS = [
  'You ask a question about Islam.',
  'An AI assistant prepares a draft from approved sources only.',
  'Qualified dāʿīs review, correct and approve their answers.',
  'You compare their answers and choose the one that helped you most.',
]

export default function AskPage() {
  const navigate = useNavigate()
  const submit = useSubmitQuestion()

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-5">
      <section className="lg:col-span-3">
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
                onSuccess: ({ id }) => navigate(`/questions/${id}`, { state: { justSubmitted: true } }),
              })
            }
          />
        </div>
      </section>

      <aside className="rounded-lg border border-stone-200 bg-white p-5 lg:col-span-2">
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
      </aside>
    </div>
  )
}
