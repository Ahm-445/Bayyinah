import EvidenceCard from '../../../shared/components/EvidenceCard.jsx'

/**
 * `isCited(item)`: whether the current text mentions this evidence (live).
 * `onInsert`: when set, each card offers "Insert citation".
 */
export default function EvidencePanel({ evidence, isCited = () => false, onInsert }) {
  return (
    <section>
      <h2 className="font-semibold">
        Evidence <span className="font-normal text-stone-500">({evidence.length})</span>
      </h2>
      {evidence.length ? (
        <div className="mt-2 space-y-3">
          {evidence.map((item) => (
            <EvidenceCard
              key={item.key}
              evidence={item}
              cited={isCited(item)}
              action={
                onInsert && (
                  <button
                    type="button"
                    onClick={() => onInsert(item)}
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
                  >
                    + Insert citation
                  </button>
                )
              }
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-stone-600">No evidence was retrieved.</p>
      )}
    </section>
  )
}
