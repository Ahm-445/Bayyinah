import CitedText from '../../../shared/components/CitedText.jsx'
import EvidenceCard from '../../../shared/components/EvidenceCard.jsx'
import { inlineLabel } from '../../../shared/lib/citations.js'
import { fullDate, timeAgo } from '../../../shared/lib/format.js'
import { textDirProps } from '../../../shared/lib/text.js'

/** Collapsed list of the answer's sources. Not rendered when there are none. */
function Sources({ citations }) {
  if (!citations.length) return null
  // Citation text is optional (not in api.md today): show full cards only if every source has it.
  const allHaveText = citations.every((c) => c.text)
  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium text-emerald-800 hover:text-emerald-950">
        View sources ({citations.length})
      </summary>
      <div className="mt-2">
        {allHaveText ? (
          <div className="space-y-2">
            {citations.map((c) => (
              <EvidenceCard key={c.key} evidence={c} />
            ))}
          </div>
        ) : (
          <ul className="space-y-1 text-sm">
            {citations.map((c) => (
              <li key={c.key} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-stone-800">{inlineLabel(c)}</span>
                {c.reference && (
                  <span {...textDirProps(c.reference)} className="text-stone-600">
                    {c.reference}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
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
          {answer.sourceCount > 0 && (
            <span className="text-stone-500">
              {answer.sourceCount} source{answer.sourceCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </header>

      <CitedText
        text={answer.finalText}
        citations={answer.citations}
        className="mt-4 flex-1 leading-relaxed text-stone-800"
      />

      {answer.citations.length > 0 && (
        <div className="mt-4">
          <Sources citations={answer.citations} />
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
        <span className="text-xs text-stone-500" title={fullDate(answer.publishedAt)}>
          {answer.aiAssisted ? 'Prepared with AI assistance' : 'Written directly by the dāʿī'}
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
