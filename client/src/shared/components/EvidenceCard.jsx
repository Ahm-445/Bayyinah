/**
 * MVP evidence card: Arabic source text and the reference string only.
 * `evidence` is a mapped evidence item (services/mappers/common.js).
 */
export default function EvidenceCard({ evidence, cited = false }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
        {evidence.reference ? (
          <span lang="ar" dir="rtl" className="text-sm text-stone-700">
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
      <p lang="ar" dir="rtl" className="mt-2 text-xl text-stone-900">
        {evidence.text}
      </p>
    </article>
  )
}
