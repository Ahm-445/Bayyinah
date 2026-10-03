import { useState } from 'react'
import { userMessage } from '../../../services/errors.js'
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx'
import QueryState from '../../../shared/components/QueryState.jsx'
import StateNotice from '../../../shared/components/StateNotice.jsx'
import { useAnswers, useSelectAnswer } from '../hooks/useQuestion.js'
import AnswerCard from './AnswerCard.jsx'

export default function AnswerList({ questionId }) {
  const query = useAnswers(questionId, { enabled: true })
  const select = useSelectAnswer(questionId)
  const [pending, setPending] = useState(null) // answer awaiting confirmation

  function confirm() {
    select.mutate(pending.id, { onSettled: () => setPending(null) })
  }

  return (
    <QueryState query={query}>
      {({ answers, selectedAnswerId }) => {
        if (!answers.length) {
          return <StateNotice title="No answers yet">Please check back soon.</StateNotice>
        }
        const chosen = answers.find((a) => a.id === selectedAnswerId)
        const single = answers.length === 1
        // The sidebar narrows the main area, so cards go side by side only on wide screens.
        const columns = single ? 'max-w-3xl' : 'xl:grid-cols-2'

        return (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">
                {single ? 'Your answer' : `Compare ${answers.length} answers`}
              </h2>
              {!chosen && (
                <p className="mt-1 text-stone-600">
                  {single
                    ? 'Read the answer, and select it if it helped you.'
                    : 'Read each answer and select the one that helped you most. You can choose only one.'}
                </p>
              )}
            </div>

            {chosen && (
              <StateNotice title="Thank you for your choice" tone="success">
                You selected the answer by {chosen.daee.displayName}. Your choice helps recognise the
                dāʿīs whose answers are clearest.
              </StateNotice>
            )}
            {select.isError && (
              <p role="alert" className="text-sm text-red-700">
                {userMessage(select.error)}
              </p>
            )}

            <div className={`grid gap-4 ${columns}`}>
              {answers.map((answer, index) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  index={index}
                  showNumber={!single}
                  selected={answer.id === selectedAnswerId}
                  canSelect={!selectedAnswerId}
                  onSelect={setPending}
                />
              ))}
            </div>

            <ConfirmDialog
              open={Boolean(pending)}
              title="Select this answer?"
              confirmLabel={select.isPending ? 'Selecting…' : 'Yes, select it'}
              busy={select.isPending}
              onConfirm={confirm}
              onCancel={() => setPending(null)}
            >
              You are choosing the answer by {pending?.daee.displayName}.{' '}
              {single
                ? 'You cannot change this later.'
                : 'You can only choose one answer for this question, and you cannot change it later.'}
            </ConfirmDialog>
          </section>
        )
      }}
    </QueryState>
  )
}
