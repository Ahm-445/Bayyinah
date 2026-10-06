import { useCallback, useRef, useState } from 'react'
import { Link, useBeforeUnload, useBlocker, useParams } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx'
import QueryState from '../../../shared/components/QueryState.jsx'
import StateNotice from '../../../shared/components/StateNotice.jsx'
import { ALLOW_LEVEL_D_OVERRIDE, DRAFT_VIEW } from '../../../shared/lib/enums.js'
import { isCitedIn, readableReference } from '../../../shared/lib/references.js'
import AiIssueNotice from '../components/AiIssueNotice.jsx'
import DraftEditor from '../components/DraftEditor.jsx'
import EvidencePanel from '../components/EvidencePanel.jsx'
import QuestionPanel from '../components/QuestionPanel.jsx'
import ReviewActions from '../components/ReviewActions.jsx'
import VerificationPanel from '../components/VerificationPanel.jsx'
import { useDraft, useSaveDraft } from '../hooks/useDraft.js'

export default function DraftReviewPage() {
  const { t } = useI18n()
  const { id } = useParams()
  const query = useDraft(id)

  return (
    <div className="space-y-4">
      <Link to="/daee" className="text-sm font-semibold text-accent hover:underline">
        {t('common.backToQueue')}
      </Link>
      <QueryState
        query={query}
        notFound={<StateNotice title={t('review.notFoundTitle')}>{t('review.notFoundBody')}</StateNotice>}
      >
        {(draft) => <DraftReview key={draft.id} draft={draft} />}
      </QueryState>
    </div>
  )
}

function DraftReview({ draft }) {
  const { t } = useI18n()
  const [writeAnyway, setWriteAnyway] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const isReferral = draft.view === DRAFT_VIEW.REFERRAL
  // Level D shows only the referral notice until the dāʿī chooses to write anyway.
  // A closed level D draft (answered or rejected earlier) shows its result.
  const referralOnly = isReferral && !draft.isClosed && !writeAnyway

  return (
    <>
      <QuestionPanel draft={draft} />

      {isReferral && (
        <StateNotice title={t('review.referral.title')} tone="danger">
          <p>{t('review.referral.body')}</p>
          {referralOnly && ALLOW_LEVEL_D_OVERRIDE && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="btn btn-sm btn-danger-outline mt-3 bg-white"
            >
              {t('review.referral.writeAnyway')}
            </button>
          )}
        </StateNotice>
      )}

      {!referralOnly && <ReviewBody draft={draft} />}

      <ConfirmDialog
        open={confirming}
        danger
        title={t('review.referral.dialogTitle')}
        confirmLabel={t('review.referral.dialogConfirm')}
        onConfirm={() => {
          setConfirming(false)
          setWriteAnyway(true)
        }}
        onCancel={() => setConfirming(false)}
      >
        <p>{t('review.referral.dialogBody')}</p>
        <p className="mt-2 font-medium text-danger">{t('review.referral.dialogStrong')}</p>
      </ConfirmDialog>
    </>
  )
}

function ReviewBody({ draft }) {
  const { t } = useI18n()
  const [text, setText] = useState(draft.text)
  const save = useSaveDraft(draft.id)
  const editable = draft.canEdit
  const dirty = editable && text !== draft.text
  const textareaRef = useRef(null)
  const editorFocused = useRef(false) // until the dāʿī places a caret, insert at the end
  const shownText = editable ? text : draft.text

  /**
   * Inserts a readable reference at the caret, replacing any selection, in
   * the QUESTION's language: "(Adh-Dhariyat 51:56)" or "(الذاريات 51:56)".
   * A textarea keeps its selection after losing focus, so it is read
   * directly when "Insert citation" is clicked.
   */
  function insertCitation(evidence) {
    const el = textareaRef.current
    const start = editorFocused.current && el ? el.selectionStart : text.length
    const end = editorFocused.current && el ? el.selectionEnd : text.length
    const before = text.slice(0, start)
    const insert = (before && !/\s$/.test(before) ? ' ' : '') + readableReference(evidence, draft.question.language)
    const caret = start + insert.length
    setText(before + insert + text.slice(end))
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(caret, caret)
    })
  }

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  )
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty) event.preventDefault()
      },
      [dirty],
    ),
  )

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        {!draft.isClosed && <AiIssueNotice draft={draft} />}
        <DraftEditor
          draft={draft}
          editable={editable}
          value={text}
          onChange={setText}
          onFocus={() => (editorFocused.current = true)}
          textareaRef={textareaRef}
          onSave={() => save.mutate(text)}
          saving={save.isPending}
          saveError={save.error}
        />
        <ReviewActions draft={draft} unsavedText={dirty ? text : null} />
      </div>
      <div className="space-y-4 lg:col-span-5">
        {/* Verification describes the AI draft; with no AI draft there is nothing to show. */}
        {draft.generatedText && <VerificationPanel verification={draft.verification} />}
        <EvidencePanel
          evidence={draft.evidence}
          isCited={(item) => isCitedIn(shownText, item)}
          onInsert={editable ? insertCitation : undefined}
        />
      </div>

      {blocker.state === 'blocked' && (
        <div
          role="alertdialog"
          aria-label={t('review.unsavedPrompt')}
          className="fixed inset-x-0 bottom-0 z-30 bg-house px-4 py-3 text-white shadow-float"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{t('review.unsavedPrompt')}</span>
            <button type="button" onClick={() => blocker.reset()} className="btn btn-sm bg-white text-accent">
              {t('review.stay')}
            </button>
            <button type="button" onClick={() => blocker.proceed()} className="btn btn-sm border-white text-white">
              {t('review.discard')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
