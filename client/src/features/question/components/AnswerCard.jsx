import EvidenceCard from '../../../shared/components/EvidenceCard.jsx'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'
import { textDirProps } from '../../../shared/lib/text.js'

function Sources({ citations }) {
  if (!citations.length) return null
  // Citation text is optional (not in api.md today): show cards only if present.
  const withText = citations.filter((c) => c.text)
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Sources</h4>
      {withText.length === citations.length ? (
        withText.map((c) => <EvidenceCard key={c.key} evidence={c} />)
      ) : (
        <ul className="flex flex-wrap gap-2">
          {citations.map((c) => (
            <li
              key={c.key}
              {...textDirProps(c.reference ?? c.chunkId)}
              className="rounded bg-stone-100 px-2 py-0.5 text-sm text-stone-700"
            >
              {c.reference ?? c.chunkId}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AnswerCard({ answer, index, selected, canSelect, onSelect }) {
  return (
    <article
      className={`flex flex-col rounded-lg border bg-white p-5 ${
        selected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-stone-200'
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Answer {index + 1}</h3>
          <p className="text-sm text-stone-600">by {answer.daee.displayName}</p>
        </div>
        {/* Questioners never see AI verification status; every published answer was reviewed. */}
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800 ring-1 ring-emerald-600/20 ring-inset">
            Reviewed by a dāʿī
          </span>
          <span className="text-stone-500">
            {answer.sourceCount} source{answer.sourceCount === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      <p dir="auto" className="mt-4 flex-1 leading-relaxed whitespace-pre-wrap text-stone-800">
        {answer.finalText}
      </p>

      <div className="mt-4">
        <Sources citations={answer.citations} />
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
        <span className="text-xs text-stone-500" title={fullDate(answer.publishedAt)}>
          {answer.aiAssisted ? 'Prepared with AI assistance' : 'Written by a dāʿī'}
          {answer.publishedAt && ` · ${timeAgo(answer.publishedAt)}`}
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
