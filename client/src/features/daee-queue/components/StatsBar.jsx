import { useI18n } from '../../../i18n/core.js'

const STATS = ['pending', 'approved', 'rejected', 'referred', 'score']

export default function StatsBar({ stats }) {
  const { t } = useI18n()
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {STATS.map((key) => (
        <div key={key} data-stat={key} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
          <dt className="text-xs text-stone-500">{t(`queue.stats.${key}`)}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{stats[key]}</dd>
        </div>
      ))}
    </dl>
  )
}
