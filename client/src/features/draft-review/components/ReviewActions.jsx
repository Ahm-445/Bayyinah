import { useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import { userMessage } from '../../../services/errors.js'
import StateNotice from '../../../shared/components/StateNotice.jsx'
import { DRAFT_STATUS } from '../../../shared/lib/enums.js'
import { useApproveDraft, useRejectDraft } from '../hooks/useDraft.js'

/**
 * Approve / reject controls. `unsavedText` is the edited text when it differs
 * from the saved draft, otherwise null; approving saves it first.
 *
 * The AI never blocks approval. When the AI could not give a usable draft
 * (or the question is level D), approving needs the responsibility checkbox;
 * a NEEDS_REVIEW draft needs the warnings checkbox. Both send
 * `acknowledgeWarnings: true` (docs/api.md field, wider use pending backend).
 */
export default function ReviewActions({ draft, unsavedText }) {
  const i18n = useI18n()
  const { t } = i18n
  const [acknowledged, setAcknowledged] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const approve = useApproveDraft(draft.id)
  const reject = useRejectDraft(draft.id)
  const busy = approve.isPending || reject.isPending

  const backToQueue = (
    <Link to="/daee" className="underline">
      {t('common.backToQueueLink')}
    </Link>
  )

  if (draft.status === DRAFT_STATUS.APPROVED) {
    return (
      <StateNotice title={t('review.actions.approvedTitle')} tone="success">
        {t('review.actions.approvedBody')} {backToQueue}
      </StateNotice>
    )
  }
  if (draft.status === DRAFT_STATUS.REJECTED) {
    return (
      <StateNotice title={t('review.actions.rejectedTitle')}>
        {t('review.actions.rejectedBody')} {backToQueue}
      </StateNotice>
    )
  }

  const currentText = unsavedText ?? draft.text
  const isEmpty = !currentText.trim()
  const needsCheckbox = draft.requiresResponsibility || draft.requiresAcknowledgement
  const canApprove = !isEmpty && (!needsCheckbox || acknowledged) && !busy
  const error = approve.error ?? reject.error

  return (
    <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      {isEmpty && <p className="text-sm text-stone-600">{t('review.actions.writeFirst')}</p>}

      {needsCheckbox && (
        <label className="flex items-start gap-2 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1"
          />
          <span>
            {draft.requiresResponsibility ? t('review.actions.responsibility') : t('review.actions.warningsAck')}
          </span>
        </label>
      )}

      {rejecting ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            reject.mutate(reason.trim())
          }}
          className="space-y-2"
        >
          <label htmlFor="reject-reason" className="text-sm font-medium">
            {t('review.actions.rejectReason')}
          </label>
          <textarea
            id="reject-reason"
            dir="auto"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            className="w-full rounded border border-stone-300 p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!reason.trim() || busy}
              className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {reject.isPending ? t('review.actions.rejecting') : t('review.actions.confirmReject')}
            </button>
            <button type="button" onClick={() => setRejecting(false)} className="px-3 py-1.5 text-sm text-stone-600">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canApprove}
            // Always send the editor text: it is plain text (Markdown stripped) even when unedited.
            onClick={() => approve.mutate({ text: currentText, acknowledgeWarnings: acknowledged })}
            className="rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
          >
            {approve.isPending
              ? t('review.actions.publishing')
              : unsavedText != null
                ? t('review.actions.saveApprove')
                : t('review.actions.approvePublish')}
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            disabled={busy}
            className="rounded border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {t('review.actions.reject')}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {userMessage(error, i18n)}
        </p>
      )}
    </section>
  )
}
