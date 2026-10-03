import { isCitedIn, readableReference } from '../../../shared/lib/references.js'

/**
 * Hint under the editor: which retrieved sources the current text mentions,
 * detected from plain text (verse numbers such as "51:56").
 */
export default function SourcesInAnswer({ text, evidence }) {
  const cited = evidence.filter((e) => isCitedIn(text, e))

  return (
    <section aria-labelledby="sources-in-answer" className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 id="sources-in-answer" className="text-sm font-semibold">
        Sources in this answer <span className="font-normal text-stone-500">({cited.length})</span>
      </h3>

      {cited.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-emerald-800">
          {cited.map((e) => (
            <li key={e.key}>{readableReference(e)}</li>
          ))}
        </ul>
      ) : (
        <p role="status" className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This answer does not mention any of the retrieved sources. Use “Insert citation” on an
          evidence card to add a reference. You can still approve.
        </p>
      )}

      <p className="mt-2 text-xs text-stone-500">
        Detected from verse numbers in the text, e.g. 51:56. The questioner sees only the answer
        text, so mention your sources in it.
      </p>
    </section>
  )
}
