import { useState } from 'react'
import { useI18n } from '../../../i18n/core.js'
import { userMessage } from '../../../services/errors.js'
import { detectLanguage, MAX_LENGTH } from '../lib/question.js'

export default function QuestionForm({ onSubmit, submitting, error }) {
  const i18n = useI18n()
  const { t, dir } = i18n
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const trimmed = text.trim()
  const tooLong = trimmed.length > MAX_LENGTH
  const invalid = !trimmed || tooLong
  const showError = touched && invalid

  function handleSubmit(event) {
    event.preventDefault()
    setTouched(true)
    if (invalid || submitting) return
    // The question's language comes from its text, not from the UI language.
    onSubmit({ text: trimmed, language: detectLanguage(trimmed) })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <label htmlFor="question" className="block font-semibold">
        {t('ask.label')}
      </label>
      <textarea
        id="question"
        // Empty: UI direction so the placeholder reads correctly; then follow the text.
        dir={text ? 'auto' : dir}
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby="question-help"
        placeholder={t('ask.placeholder')}
        className="input p-4 leading-relaxed"
      />
      <div id="question-help" className="flex justify-between gap-4 text-sm">
        <span className={showError ? 'text-danger' : 'text-ink-soft'}>
          {showError
            ? tooLong
              ? t('ask.tooLong', { max: MAX_LENGTH })
              : t('ask.empty')
            : t('ask.privacy')}
        </span>
        <span dir="ltr" className={`tabular-nums ${tooLong ? 'text-danger' : 'text-ink-soft'}`}>
          {trimmed.length}/{MAX_LENGTH}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {userMessage(error, i18n)}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary btn-lg"
      >
        {submitting ? t('ask.sending') : t('ask.send')}
      </button>
    </form>
  )
}
