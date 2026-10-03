import { textDirProps } from '../lib/text.js'

/**
 * MVP evidence card: source text and the reference string only.
 * Arabic text renders RTL in the Arabic font; anything else uses dir="auto".
 * `evidence` is a mapped evidence item (services/mappers/common.js).
 */
export default function EvidenceCard({ evidence, cited = false, action = null }) {
  const textProps = textDirProps(evidence.text)
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
        {evidence.reference ? (
          <span {...textDirProps(evidence.reference)} className="text-sm text-stone-700">
            {evidence.reference}
          </span>
        ) : (
          <span>{evidence.chunkId}</span>
        )}
        {cited && (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
            Cited
          </span>
        )}
      </div>
      <p
        {...textProps}
        className={`mt-2 whitespace-pre-line text-stone-900 ${textProps.lang === 'ar' ? 'text-xl' : 'text-base leading-relaxed'}`}
      >
        {evidence.text}
      </p>
      {action && <div className="mt-3 border-t border-stone-100 pt-2">{action}</div>}
    </article>
  )
}
