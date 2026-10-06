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
          // The score is the one "earned" figure, so it gets the deep band and gold.
          className={`rounded-card px-4 py-4 ${key === 'score' ? 'col-span-2 bg-house text-white sm:col-span-1' : 'bg-white shadow-card'}`}
        >
          <dt className={`text-xs font-semibold ${key === 'score' ? 'text-white/70' : 'text-ink-soft'}`}>
            {t(`queue.stats.${key}`)}
          </dt>
          <dd className={`mt-1 text-3xl font-semibold tabular-nums ${key === 'score' ? 'text-gold' : 'text-ink'}`}>
            {stats[key]}
          </dd>
          {key === 'score' && breakdown && (
            // Computed by the server: +1 per published answer, +10 per selection.
            <dd data-score-breakdown className="mt-1 text-xs text-white/70">
              {t('queue.scoreBreakdown', breakdown)}
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}
