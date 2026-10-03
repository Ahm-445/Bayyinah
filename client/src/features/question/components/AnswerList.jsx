import { useState } from 'react'
import { useI18n } from '../../../i18n/core.js'
import { userMessage } from '../../../services/errors.js'
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx'
import QueryState from '../../../shared/components/QueryState.jsx'
import StateNotice from '../../../shared/components/StateNotice.jsx'
import { useAnswers, useSelectAnswer } from '../hooks/useQuestion.js'
import AnswerCard from './AnswerCard.jsx'

export default function AnswerList({ questionId }) {
  const i18n = useI18n()
  const { t } = i18n
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
          return <StateNotice title={t('answers.noneTitle')}>{t('answers.noneBody')}</StateNotice>
        }
        const chosen = answers.find((a) => a.id === selectedAnswerId)
        const single = answers.length === 1
        // The sidebar narrows the main area, so cards go side by side only on wide screens.
        const columns = single ? 'max-w-3xl' : 'xl:grid-cols-2'

        return (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">
                {single ? t('answers.yourAnswer') : t('answers.compare', { count: answers.length })}
              </h2>
              {!chosen && (
                <p className="mt-1 text-stone-600">{single ? t('answers.readOne') : t('answers.readMany')}</p>
              )}
            </div>

            {chosen && (
              <StateNotice title={t('answers.thanksTitle')} tone="success">
                {t('answers.thanksBody', { name: chosen.daee.displayName })}
              </StateNotice>
            )}
            {select.isError && (
              <p role="alert" className="text-sm text-red-700">
                {userMessage(select.error, i18n)}
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
              title={t('answers.dialogTitle')}
              confirmLabel={select.isPending ? t('answers.selecting') : t('answers.dialogConfirm')}
              busy={select.isPending}
              onConfirm={confirm}
              onCancel={() => setPending(null)}
            >
              {t('answers.dialogBody', { name: pending?.daee.displayName ?? '' })}{' '}
              {single ? t('answers.dialogOne') : t('answers.dialogMany')}
            </ConfirmDialog>
          </section>
        )
      }}
    </QueryState>
  )
}
