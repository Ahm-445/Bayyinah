import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import { MY_QUESTIONS_KEY } from '../../question-history/hooks/useMyQuestions.js'
import QuestionForm from '../components/QuestionForm.jsx'
import { useSubmitQuestion } from '../hooks/useSubmitQuestion.js'

const STEPS = ['one', 'two', 'three', 'four']

/** Questioner dashboard main area: the ask box. */
export default function AskPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const submit = useSubmitQuestion()

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">{t('ask.title')}</h1>
        <p className="mt-2 text-stone-600">{t('ask.subtitle')}</p>
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
        <h2 className="font-semibold">{t('ask.howItWorks')}</h2>
        <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm text-stone-700">
          {STEPS.map((step) => (
            <li key={step}>{t(`ask.steps.${step}`)}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-stone-600">{t('ask.referralNote')}</p>
      </section>
    </div>
  )
}
