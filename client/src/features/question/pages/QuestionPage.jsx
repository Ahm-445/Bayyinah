import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import { MY_QUESTIONS_KEY } from '../../question-history/hooks/useMyQuestions.js'
import QueryState from '../../../shared/components/QueryState.jsx'
import StateNotice from '../../../shared/components/StateNotice.jsx'
import { QUESTION_STATUS } from '../../../shared/lib/enums.js'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'
import AnswerList from '../components/AnswerList.jsx'
import ProgressSteps from '../components/ProgressSteps.jsx'
import { useQuestion } from '../hooks/useQuestion.js'

function AskLink() {
  const { t } = useI18n()
  return (
    <Link to="/ask" className="font-medium underline">
      {t('question.askLink')}
    </Link>
  )
}

export default function QuestionPage() {
  const { t } = useI18n()
  const { id } = useParams()
  const location = useLocation()
  const query = useQuestion(id)

  return (
    <div className="space-y-6">
      <QueryState
        query={query}
        notFound={
          <StateNotice title={t('question.notFoundTitle')}>
            {t('question.notFoundBody')} <AskLink />.
          </StateNotice>
        }
      >
        {(question) => (
          <QuestionView question={question} justSubmitted={Boolean(location.state?.justSubmitted)} />
        )}
      </QueryState>
    </div>
  )
}

function QuestionView({ question, justSubmitted }) {
  const { t, locale } = useI18n()
  const { status } = question
  const inProgress = question.isProcessing || status === QUESTION_STATUS.AWAITING_REVIEW
  const queryClient = useQueryClient()

  // Keep the sidebar's status chip in step with this page.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: MY_QUESTIONS_KEY })
  }, [status, queryClient])

  return (
    <>
      <header>
        <p className="text-sm text-stone-500" title={fullDate(question.createdAt, locale)}>
          {t('question.asked', { time: timeAgo(question.createdAt, { locale }) })}
        </p>
        {/* Content keeps its own language and direction, whatever the UI language. */}
        <h1 dir="auto" lang={question.language} className="mt-1 text-2xl font-semibold text-stone-900">
          {question.text}
        </h1>
      </header>

      {justSubmitted && (
        <StateNotice title={t('question.sentTitle')} tone="success">
          {t('question.sentBody')}
        </StateNotice>
      )}

      {inProgress && (
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <ProgressSteps status={status} />
          <p className="mt-4 text-sm text-stone-600">
            {status === QUESTION_STATUS.AWAITING_REVIEW ? t('question.reviewingNote') : t('question.autoUpdate')}
          </p>
        </section>
      )}

      {status === QUESTION_STATUS.REFERRED && (
        <StateNotice title={t('question.referredTitle')} tone="warning">
          {t('question.referredBody')}
        </StateNotice>
      )}

      {status === QUESTION_STATUS.FAILED && (
        <StateNotice title={t('question.failedTitle')} tone="danger">
          {t('question.failedBody')} <AskLink />.
        </StateNotice>
      )}

      {status === QUESTION_STATUS.ANSWERED && <AnswerList key={question.id} questionId={question.id} />}
    </>
  )
}
