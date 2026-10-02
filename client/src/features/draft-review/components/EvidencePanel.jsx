import EvidenceCard from '../../../shared/components/EvidenceCard.jsx'

export default function EvidencePanel({ evidence, citations }) {
  const cited = new Set(citations.map((c) => c.key))

  return (
    <section>
      <h2 className="font-semibold">
        Evidence <span className="font-normal text-stone-500">({evidence.length})</span>
      </h2>
      {evidence.length ? (
        <div className="mt-2 space-y-3">
          {evidence.map((item) => (
            <EvidenceCard key={item.key} evidence={item} cited={cited.has(item.key)} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-stone-600">No evidence was retrieved.</p>
      )}
    </section>
  )
}
