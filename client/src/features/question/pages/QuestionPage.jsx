import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { MY_QUESTIONS_KEY } from '../../question-history/hooks/useMyQuestions.js'
import QueryState from '../../../shared/components/QueryState.jsx'
import StateNotice from '../../../shared/components/StateNotice.jsx'
import { QUESTION_STATUS } from '../../../shared/lib/enums.js'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'
import AnswerList from '../components/AnswerList.jsx'
import ProgressSteps from '../components/ProgressSteps.jsx'
import { useQuestion } from '../hooks/useQuestion.js'

const askAgain = (
  <Link to="/ask" className="font-medium underline">
    Ask a question
  </Link>
)

export default function QuestionPage() {
  const { id } = useParams()
  const location = useLocation()
  const query = useQuestion(id)

  return (
    <div className="space-y-6">
      <QueryState
        query={query}
        notFound={
          <StateNotice title="Question not found">
            It may not exist, or it belongs to another account. Pick one of your questions, or{' '}
            {askAgain}.
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
        <p className="text-sm text-stone-500" title={fullDate(question.createdAt)}>
          Your question · asked {timeAgo(question.createdAt)}
        </p>
        <h1 dir="auto" lang={question.language} className="mt-1 text-2xl font-semibold text-stone-900">
          {question.text}
        </h1>
      </header>

      {justSubmitted && (
        <StateNotice title="Your question was sent" tone="success">
          It is saved in your account under “Your questions”. This page updates automatically.
        </StateNotice>
      )}

      {inProgress && (
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <ProgressSteps status={status} />
          <p className="mt-4 text-sm text-stone-600">
            {status === QUESTION_STATUS.AWAITING_REVIEW
              ? 'Dāʿīs are reviewing your question. Answers appear here as soon as one is approved. You can close this page and come back later.'
              : 'This page updates automatically.'}
          </p>
        </section>
      )}

      {status === QUESTION_STATUS.REFERRED && (
        <StateNotice title="This question needs a scholar" tone="warning">
          Your question asks for a personal religious ruling (fatwa), which depends on individual
          circumstances. Bayyinah only answers general questions, so we recommend asking a qualified
          scholar directly.
        </StateNotice>
      )}

      {status === QUESTION_STATUS.FAILED && (
        <StateNotice title="We could not process your question" tone="danger">
          Something went wrong on our side. Please try again: {askAgain}.
        </StateNotice>
      )}

      {status === QUESTION_STATUS.ANSWERED && <AnswerList key={question.id} questionId={question.id} />}
    </>
  )
}
