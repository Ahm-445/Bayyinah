import { useState } from 'react'
import { Link } from 'react-router'
import { userMessage } from '../../../services/errors.js'
import { DRAFT_STATUS } from '../../../shared/lib/enums.js'
import { useApproveDraft, useRejectDraft } from '../hooks/useDraft.js'
import StateNotice from '../../../shared/components/StateNotice.jsx'

const BLOCKED_REASON = {
  FAIL: 'Verification failed: the draft cites sources that were not retrieved or makes claims the evidence does not support.',
}

/**
 * Approve / reject controls. `unsavedText` is the edited text when it differs
 * from the saved draft, otherwise null; approving saves it first.
 */
export default function ReviewActions({ draft, unsavedText, allowApprove = true }) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const approve = useApproveDraft(draft.id)
  const reject = useRejectDraft(draft.id)
  const busy = approve.isPending || reject.isPending

  if (draft.status === DRAFT_STATUS.APPROVED) {
    return (
      <StateNotice title="Approved and published" tone="success">
        The questioner can now see this answer. <Link to="/daee" className="underline">Back to queue</Link>
      </StateNotice>
    )
  }
  if (draft.status === DRAFT_STATUS.REJECTED) {
    return (
      <StateNotice title="Rejected">
        This draft will not be published. <Link to="/daee" className="underline">Back to queue</Link>
      </StateNotice>
    )
  }

  const emptyEdit = unsavedText != null && !unsavedText.trim()
  const needsAck = draft.requiresAcknowledgement && !acknowledged
  const canApprove = allowApprove && draft.canApprove && !needsAck && !emptyEdit && !busy
  const error = approve.error ?? reject.error

  return (
    <section className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
      {draft.isBlocked && allowApprove && (
        <p className="text-sm text-red-800">
          <span className="font-semibold">Approval blocked.</span>{' '}
          {BLOCKED_REASON[draft.verification?.status] ??
            'This draft did not pass the automatic checks and cannot be published.'}
        </p>
      )}

      {draft.requiresAcknowledgement && draft.canApprove && (
        <label className="flex items-start gap-2 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1"
          />
          <span>I have read the verification warnings and take responsibility for this answer.</span>
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
            Reason for rejecting
          </label>
          <textarea
            id="reject-reason"
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
              {reject.isPending ? 'Rejecting…' : 'Confirm reject'}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="px-3 py-1.5 text-sm text-stone-600"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {allowApprove && (
            <button
              type="button"
              disabled={!canApprove}
              onClick={() => approve.mutate({ unsavedText, acknowledgeWarnings: acknowledged })}
              className="rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
            >
              {approve.isPending ? 'Publishing…' : unsavedText != null ? 'Save & approve' : 'Approve & publish'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setRejecting(true)}
            disabled={busy}
            className="rounded border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {userMessage(error)}
        </p>
      )}
    </section>
  )
}
