import { useI18n } from '../../../i18n/core.js'

const STATS = ['pending', 'approved', 'rejected', 'referred', 'score']

export default function StatsBar({ stats }) {
  const { t } = useI18n()
  const breakdown = stats.scoreBreakdown
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {STATS.map((key) => (
        <div
          key={key}
          data-stat={key}
          title={key === 'score' ? t('queue.scoreRule') : undefined}
          className="rounded-lg border border-stone-200 bg-white px-4 py-3"
        >
          <dt className="text-xs text-stone-500">{t(`queue.stats.${key}`)}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{stats[key]}</dd>
          {key === 'score' && breakdown && (
            // Computed by the server: +1 per published answer, +10 per selection.
            <dd data-score-breakdown className="mt-1 text-xs text-stone-500">
              {t('queue.scoreBreakdown', breakdown)}
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}
