import { inlineLabel, tokenize } from '../lib/citations.js'

/**
 * Answer text with [[chunkId]] markers rendered as readable inline
 * references, e.g. "(Qur'an 51:56)". `citations` are mapped citation or
 * evidence items (anything with chunkId + reference).
 * Markers with no matching citation are dropped, or flagged when
 * `showUnknown` is set (dāʿī views).
 */
export default function CitedText({ text, citations, showUnknown = false, className = '', ...props }) {
  const byId = new Map(citations.map((c) => [c.chunkId, c]))

  return (
    <p dir="auto" className={`whitespace-pre-wrap ${className}`} {...props}>
      {tokenize(text).map((token, index) => {
        if (token.type === 'text') return token.value
        const known = token.ids.map((id) => byId.get(id)).filter(Boolean)
        const unknown = token.ids.filter((id) => !byId.has(id))
        return (
          <span key={index}>
            {known.length > 0 && (
              <cite
                title={known.map((c) => c.reference).filter(Boolean).join(' · ')}
                className="text-sm whitespace-nowrap text-emerald-800 not-italic"
              >
                ({known.map(inlineLabel).join('; ')})
              </cite>
            )}
            {showUnknown &&
              unknown.map((id) => (
                <span key={id} className="mx-0.5 rounded bg-red-50 px-1 text-sm text-red-700">
                  [not in evidence: {id}]
                </span>
              ))}
          </span>
        )
      })}
    </p>
  )
}
