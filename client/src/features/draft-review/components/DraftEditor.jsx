import { userMessage } from '../../../services/errors.js'
import AiNotice from '../../../shared/components/AiNotice.jsx'
import SourcesInAnswer from './SourcesInAnswer.jsx'

export default function DraftEditor({
  draft,
  editable,
  value,
  onChange,
  onFocus,
  textareaRef,
  onSave,
  saving,
  saveError,
}) {
  const dirty = value !== draft.text
  const hasAiDraft = Boolean(draft.generatedText)
  const isOriginal = value === draft.generatedText
  const versionLabel =
    draft.versions.length > 1
      ? `Version ${draft.versions.length}`
      : hasAiDraft
        ? 'Original AI draft'
        : 'No AI draft: written by you'

  return (
    <section className="space-y-3">
      {hasAiDraft && <AiNotice />}
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{hasAiDraft ? 'Draft answer' : 'Your answer'}</h2>
        <span className="text-xs text-stone-500">
          {versionLabel}
          {dirty && ' · unsaved changes'}
        </span>
      </div>

      {editable ? (
        <>
          <label htmlFor="draft-text" className="sr-only">
            {hasAiDraft ? 'Draft answer' : 'Your answer'}
          </label>
          <textarea
            id="draft-text"
            ref={textareaRef}
            dir="auto"
            lang={draft.question.language}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            rows={14}
            placeholder={hasAiDraft ? undefined : 'Write the answer here. Use “Insert citation” to reference the evidence.'}
            className="w-full rounded-lg border border-stone-300 bg-white p-4 leading-relaxed focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || !value.trim() || saving}
              className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            {hasAiDraft && (
              <button
                type="button"
                onClick={() => onChange(draft.generatedText)}
                disabled={isOriginal}
                className="text-sm text-stone-600 underline disabled:no-underline disabled:opacity-50"
              >
                Restore AI draft
              </button>
            )}
            {saveError && (
              <span role="alert" className="text-sm text-red-700">
                {userMessage(saveError)}
              </span>
            )}
          </div>
          {draft.evidence.length > 0 && <SourcesInAnswer text={value} evidence={draft.evidence} />}
        </>
      ) : (
        <div
          dir="auto"
          lang={draft.question.language}
          className="rounded-lg border border-stone-200 bg-stone-50 p-4 leading-relaxed whitespace-pre-wrap text-stone-800"
        >
          {draft.text || <span className="text-stone-500">No answer text.</span>}
        </div>
      )}
    </section>
  )
}
