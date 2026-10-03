import { useCallback, useRef, useState } from 'react'
import { Link, useBeforeUnload, useBlocker, useParams } from 'react-router'
import QueryState from '../../../shared/components/QueryState.jsx'
import { isCitedIn, readableReference } from '../../../shared/lib/references.js'
import { DRAFT_VIEW } from '../../../shared/lib/enums.js'
import DraftEditor from '../components/DraftEditor.jsx'
import EvidencePanel from '../components/EvidencePanel.jsx'
import QuestionPanel from '../components/QuestionPanel.jsx'
import ReviewActions from '../components/ReviewActions.jsx'
import StateNotice from '../../../shared/components/StateNotice.jsx'
import VerificationPanel from '../components/VerificationPanel.jsx'
import { useDraft, useSaveDraft } from '../hooks/useDraft.js'

export default function DraftReviewPage() {
  const { id } = useParams()
  const query = useDraft(id)

  return (
    <div className="space-y-4">
      <Link to="/daee" className="text-sm text-stone-600 hover:text-stone-950">
        ← Back to queue
      </Link>
      <QueryState
        query={query}
        notFound={<StateNotice title="Draft not found">It may belong to another dāʿī, or the link is wrong.</StateNotice>}
      >
        {(draft) => <DraftReview key={draft.id} draft={draft} />}
      </QueryState>
    </div>
  )
}

function DraftReview({ draft }) {
  return (
    <>
      <QuestionPanel draft={draft} />
      {draft.view === DRAFT_VIEW.REVIEW && <ReviewBody draft={draft} />}

      {draft.view === DRAFT_VIEW.REFERRAL && (
        <StateNotice title="Referred: personal ruling (Level D)" tone="danger">
          Bayyinah does not answer requests for a personal fatwa. This question is referred to a
          qualified scholar and no AI draft was generated.
        </StateNotice>
      )}

      {draft.view === DRAFT_VIEW.CLARIFY && (
        <StateNotice title="Needs clarification">
          The AI judged this question too unclear to answer, so no draft was generated. How
          clarification requests are handled has not been decided yet.
        </StateNotice>
      )}

      {draft.view === DRAFT_VIEW.INSUFFICIENT && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <StateNotice title="Insufficient evidence" tone="warning">
              The approved sources did not contain enough evidence to draft an answer, so no draft
              was generated. The retrieved sources are listed for reference.
            </StateNotice>
            <ReviewActions draft={draft} unsavedText={null} allowApprove={false} />
          </div>
          <div className="lg:col-span-5">
            <EvidencePanel evidence={draft.evidence} />
          </div>
        </div>
      )}
    </>
  )
}

function ReviewBody({ draft }) {
  const [text, setText] = useState(draft.text)
  const save = useSaveDraft(draft.id)
  const dirty = draft.canEdit && text !== draft.text
  const textareaRef = useRef(null)
  const editorFocused = useRef(false) // until the dāʿī places a caret, insert at the end
  const shownText = draft.canEdit ? text : draft.text

  /**
   * Inserts a readable reference such as "(Adh-Dhariyat 51:56)" at the caret,
   * replacing any selection. A textarea keeps its selection after losing
   * focus, so it is read directly when "Insert citation" is clicked.
   */
  function insertCitation(evidence) {
    const el = textareaRef.current
    const start = editorFocused.current && el ? el.selectionStart : text.length
    const end = editorFocused.current && el ? el.selectionEnd : text.length
    const before = text.slice(0, start)
    const insert = (before && !/\s$/.test(before) ? ' ' : '') + readableReference(evidence)
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
        <DraftEditor
          draft={draft}
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
        <VerificationPanel verification={draft.verification} />
        <EvidencePanel
          evidence={draft.evidence}
          isCited={(item) => isCitedIn(shownText, item)}
          onInsert={draft.canEdit ? insertCitation : undefined}
        />
      </div>

      {blocker.state === 'blocked' && (
        <div
          role="alertdialog"
          aria-label="Unsaved changes"
          className="fixed inset-x-0 bottom-0 z-10 border-t border-amber-300 bg-amber-50 px-4 py-3 shadow-lg"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-amber-900">You have unsaved edits. Leave anyway?</span>
            <button type="button" onClick={() => blocker.reset()} className="rounded bg-white px-3 py-1 ring-1 ring-stone-300">
              Stay
            </button>
            <button type="button" onClick={() => blocker.proceed()} className="px-3 py-1 text-red-700">
              Discard and leave
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
