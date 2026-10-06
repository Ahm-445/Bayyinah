import { useI18n } from '../../../i18n/core.js'
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
  const i18n = useI18n()
  const { t, dir } = i18n
  const dirty = value !== draft.text
  const hasAiDraft = Boolean(draft.generatedText)
  const isOriginal = value === draft.generatedText
  const heading = hasAiDraft ? t('review.draftAnswer') : t('review.yourAnswer')
  const versionLabel =
    draft.versions.length > 1
      ? t('review.version', { n: draft.versions.length })
      : hasAiDraft
        ? t('review.originalAi')
        : t('review.noAiDraft')

  return (
    <section className="space-y-3">
      {hasAiDraft && <AiNotice />}
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl">{heading}</h2>
        <span className="text-xs text-ink-soft">
          {versionLabel}
          {dirty && t('review.unsaved')}
        </span>
      </div>

      {editable ? (
        <>
          <label htmlFor="draft-text" className="sr-only">
            {heading}
          </label>
          {/* Answer text follows the question's language, not the UI language. */}
          <textarea
            id="draft-text"
            ref={textareaRef}
            // Empty: UI direction so the placeholder reads correctly; then follow the text.
            dir={value ? 'auto' : dir}
            lang={draft.question.language}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            rows={14}
            placeholder={hasAiDraft ? undefined : t('review.placeholder')}
            className="input p-4 leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || !value.trim() || saving}
              className="btn btn-sm btn-outline bg-white"
            >
              {saving ? t('review.saving') : t('review.save')}
            </button>
            {hasAiDraft && (
              <button
                type="button"
                onClick={() => onChange(draft.generatedText)}
                disabled={isOriginal}
                className="text-sm text-ink-soft underline underline-offset-2 disabled:no-underline disabled:opacity-50"
              >
                {t('review.restore')}
              </button>
            )}
            {saveError && (
              <span role="alert" className="text-sm text-danger">
                {userMessage(saveError, i18n)}
              </span>
            )}
          </div>
          {draft.evidence.length > 0 && <SourcesInAnswer text={value} evidence={draft.evidence} language={draft.question.language} />}
        </>
      ) : (
        <div
          dir="auto"
          lang={draft.question.language}
          className="card p-5 leading-relaxed whitespace-pre-wrap text-ink"
        >
          {draft.text || <span className="text-ink-soft">{t('review.noText')}</span>}
        </div>
      )}
    </section>
  )
}
