import { userMessage } from '../../../services/errors.js'
import AiNotice from '../../../shared/components/AiNotice.jsx'

export default function DraftEditor({ draft, value, onChange, onSave, saving, saveError }) {
  const dirty = value !== draft.text
  const isOriginal = value === draft.generatedText

  return (
    <section className="space-y-3">
      <AiNotice />
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Draft answer</h2>
        <span className="text-xs text-stone-500">
          {draft.versions.length > 1 ? `Version ${draft.versions.length}` : 'Original AI draft'}
          {dirty && ' · unsaved changes'}
        </span>
      </div>

      {draft.canEdit ? (
        <>
          <label htmlFor="draft-text" className="sr-only">
            Draft answer
          </label>
          <textarea
            id="draft-text"
            dir="auto"
            lang={draft.question.language}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={14}
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
            <button
              type="button"
              onClick={() => onChange(draft.generatedText)}
              disabled={isOriginal}
              className="text-sm text-stone-600 underline disabled:no-underline disabled:opacity-50"
            >
              Restore AI draft
            </button>
            {saveError && (
              <span role="alert" className="text-sm text-red-700">
                {userMessage(saveError)}
              </span>
            )}
          </div>
        </>
      ) : (
        <div
          dir="auto"
          lang={draft.question.language}
          className="rounded-lg border border-stone-200 bg-stone-50 p-4 leading-relaxed whitespace-pre-wrap text-stone-800"
        >
          {draft.text}
        </div>
      )}
    </section>
  )
}
