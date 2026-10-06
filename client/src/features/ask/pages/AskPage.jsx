import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import { MY_QUESTIONS_KEY } from '../../question-history/hooks/useMyQuestions.js'
import QuestionForm from '../components/QuestionForm.jsx'
import { useSubmitQuestion } from '../hooks/useSubmitQuestion.js'

/** Questioner dashboard main area: the ask box. */
export default function AskPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const submit = useSubmitQuestion()

  return (
    <section>
      <h1 className="display text-3xl leading-tight font-semibold text-brand sm:text-4xl">{t('ask.title')}</h1>
      <p className="mt-3 text-lg text-ink-soft">{t('ask.subtitle')}</p>
      <div className="card mt-6 p-5 sm:p-6">
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
  )
}
