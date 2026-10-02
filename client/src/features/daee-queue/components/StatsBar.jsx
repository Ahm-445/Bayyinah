const STATS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['referred', 'Referred'],
  ['score', 'Score'],
]

export default function StatsBar({ stats }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {STATS.map(([key, label]) => (
        <div key={key} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
          <dt className="text-xs text-stone-500">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{stats[key]}</dd>
        </div>
      ))}
    </dl>
  )
}
