import { inlineLabel, markerIds } from '../../../shared/lib/citations.js'
import { textDirProps } from '../../../shared/lib/text.js'

/** Live list of the sources the current text cites, from its [[chunkId]] markers. */
export default function SourcesInAnswer({ text, evidence }) {
  const byId = new Map(evidence.map((e) => [e.chunkId, e]))
  const ids = markerIds(text)
  const known = ids.filter((id) => byId.has(id)).map((id) => byId.get(id))
  const unknown = ids.filter((id) => !byId.has(id))

  return (
    <section aria-labelledby="sources-in-answer" className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 id="sources-in-answer" className="text-sm font-semibold">
        Sources in this answer <span className="font-normal text-stone-500">({known.length})</span>
      </h3>

      {known.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm">
          {known.map((e) => (
            <li key={e.chunkId} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium text-emerald-800">{inlineLabel(e)}</span>
              {e.reference && (
                <span {...textDirProps(e.reference)} className="text-stone-600">
                  {e.reference}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This answer cites no sources, so the questioner will see it without evidence. Use
          “Insert citation” on an evidence card to cite one. You can still approve.
        </p>
      )}

      {unknown.length > 0 && (
        <p className="mt-2 text-sm text-red-700">
          Not in the retrieved evidence, will not be shown: {unknown.join(', ')}
        </p>
      )}

      <p className="mt-2 text-xs text-stone-500">
        Markers such as [[quran-hafs-51-56]] appear to the questioner as “(Qur'an 51:56)”. Sources
        you remove from the text are not published.
      </p>
    </section>
  )
}
