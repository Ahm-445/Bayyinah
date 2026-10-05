import { useI18n } from '../../../i18n/core.js'
import { isCitedIn, readableReference } from '../../../shared/lib/references.js'

/**
 * Hint under the editor: which retrieved sources the current text mentions,
 * detected from plain text (verse numbers such as "51:56"). References are
 * shown in the question's language, like the ones "Insert citation" inserts.
 */
export default function SourcesInAnswer({ text, evidence, language }) {
  const { t } = useI18n()
  const cited = evidence.filter((e) => isCitedIn(text, e))

  return (
    <section aria-labelledby="sources-in-answer" className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 id="sources-in-answer" className="text-sm font-semibold">
        {t('review.sourcesTitle')} <span className="font-normal text-stone-500">({cited.length})</span>
      </h3>

      {cited.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-emerald-800">
          {cited.map((e) => (
            <li key={e.key}>
              {/* bdi: the reference keeps its own direction; the line follows the UI alignment. */}
              <bdi>{readableReference(e, language)}</bdi>
            </li>
          ))}
        </ul>
      ) : (
        <p role="status" className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t('review.sourcesNone')}
        </p>
      )}

      <p className="mt-2 text-xs text-stone-500">{t('review.sourcesHint')}</p>
    </section>
  )
}
