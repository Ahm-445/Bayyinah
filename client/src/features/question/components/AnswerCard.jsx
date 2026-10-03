import { fullDate, timeAgo } from '../../../shared/lib/format.js'

/**
 * A published answer as the questioner sees it: the dāʿī's text only.
 * No sources list, source count or verification status; the dāʿī mentions
 * sources inside the text.
 */
export default function AnswerCard({ answer, index, showNumber, selected, canSelect, onSelect }) {
  return (
    <article
      className={`flex flex-col rounded-lg border bg-white p-5 ${
        selected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-stone-200'
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {showNumber && <h3 className="font-semibold">Answer {index + 1}</h3>}
          <p className="text-sm text-stone-600">by {answer.daee.displayName}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20 ring-inset">
          Reviewed and approved by a dāʿī
        </span>
      </header>

      <p dir="auto" className="mt-4 flex-1 leading-relaxed whitespace-pre-wrap text-stone-800">
        {answer.finalText}
      </p>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
        <span className="text-xs text-stone-500" title={fullDate(answer.publishedAt)}>
          {answer.publishedAt && `Published ${timeAgo(answer.publishedAt)}`}
        </span>
        {selected ? (
          <span className="rounded bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-800">
            Your choice
          </span>
        ) : (
          canSelect && (
            <button
              type="button"
              onClick={() => onSelect(answer)}
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Select this answer
            </button>
          )
        )}
      </footer>
    </article>
  )
}
