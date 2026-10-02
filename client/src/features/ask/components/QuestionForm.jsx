import { useState } from 'react'
import { userMessage } from '../../../services/errors.js'
import { detectLanguage, MAX_LENGTH } from '../lib/question.js'

export default function QuestionForm({ onSubmit, submitting, error }) {
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
    onSubmit({ text: trimmed, language: detectLanguage(trimmed) })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <label htmlFor="question" className="block font-medium">
        Your question
      </label>
      <textarea
        id="question"
        dir="auto"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby="question-help"
        placeholder="For example: What do Muslims believe about God?"
        className={`w-full rounded-lg border bg-white p-4 leading-relaxed focus:ring-2 focus:outline-none ${
          showError
            ? 'border-red-400 focus:ring-red-500/20'
            : 'border-stone-300 focus:border-emerald-600 focus:ring-emerald-600/20'
        }`}
      />
      <div id="question-help" className="flex justify-between gap-4 text-sm">
        <span className={showError ? 'text-red-700' : 'text-stone-500'}>
          {showError
            ? tooLong
              ? `Please shorten your question to ${MAX_LENGTH} characters.`
              : 'Please write your question.'
            : 'Please do not include personal details such as your name or contact information.'}
        </span>
        <span className={`tabular-nums ${tooLong ? 'text-red-700' : 'text-stone-500'}`}>
          {trimmed.length}/{MAX_LENGTH}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {userMessage(error)}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send question'}
      </button>
    </form>
  )
}
