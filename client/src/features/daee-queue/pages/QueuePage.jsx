import { useI18n } from '../../../i18n/core.js'
import QueryState from '../../../shared/components/QueryState.jsx'
import QueueTable from '../components/QueueTable.jsx'
import StatsBar from '../components/StatsBar.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import { splitQueue } from '../lib/queueSections.js'

function EmptyState({ children }) {
  return (
    <p className="rounded-card border border-dashed border-black/20 bg-white/60 px-4 py-8 text-center text-ink-soft">
      {children}
    </p>
  )
}

export default function QueuePage() {
  const { t } = useI18n()
  const query = useDashboard()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand sm:text-3xl">{t('queue.title')}</h1>
      <QueryState query={query}>
        {(dashboard) => {
          const { pending, referred } = splitQueue(dashboard.queue)
          // Re-evaluated on each refetch, so "time since" stays roughly current.
          const now = query.dataUpdatedAt
          return (
            <>
              {/* Pending is counted from the same split as the list below, so they always match. */}
              <StatsBar stats={{ ...dashboard.stats, pending: pending.length }} />

              <section aria-labelledby="queue-needs-review" className="space-y-3">
                <h2 id="queue-needs-review" className="text-xl">
                  {t('queue.needsReview')} <span className="font-normal text-ink-soft">({pending.length})</span>
                </h2>
                {pending.length ? (
                  <QueueTable items={pending} now={now} />
                ) : (
                  <EmptyState>{t('queue.empty')}</EmptyState>
                )}
              </section>

              {referred.length > 0 && (
                <section aria-labelledby="queue-referred" className="space-y-3">
                  <h2 id="queue-referred" className="text-xl">
                    {t('queue.referredTitle')}{' '}
                    <span className="font-normal text-ink-soft">({referred.length})</span>
                  </h2>
                  <p className="text-sm text-ink-soft">{t('queue.referredNote')}</p>
                  <QueueTable items={referred} now={now} referred />
                </section>
              )}
            </>
          )
        }}
      </QueryState>
    </div>
  )
}
