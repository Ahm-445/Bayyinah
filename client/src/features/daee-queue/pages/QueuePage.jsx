import QueryState from '../../../shared/components/QueryState.jsx'
import QueueTable from '../components/QueueTable.jsx'
import StatsBar from '../components/StatsBar.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import { splitQueue } from '../lib/queueSections.js'

function EmptyState({ children }) {
  return (
    <p className="rounded-lg border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-stone-600">
      {children}
    </p>
  )
}

export default function QueuePage() {
  const query = useDashboard()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Work queue</h1>
      <QueryState query={query}>
        {(dashboard) => {
          const { pending, referred } = splitQueue(dashboard.queue)
          // Re-evaluated on each refetch, so "time since" stays roughly current.
          const now = query.dataUpdatedAt
          return (
            <>
              {/* Pending is counted from the same split as the list below, so they always match. */}
              <StatsBar stats={{ ...dashboard.stats, pending: pending.length }} />

              <section className="space-y-2">
                <h2 className="font-semibold">
                  Needs review <span className="font-normal text-stone-500">({pending.length})</span>
                </h2>
                {pending.length ? (
                  <QueueTable items={pending} now={now} />
                ) : (
                  <EmptyState>No drafts are waiting for review.</EmptyState>
                )}
              </section>

              {referred.length > 0 && (
                <section className="space-y-2">
                  <h2 className="font-semibold">
                    Referred (Level D){' '}
                    <span className="font-normal text-stone-500">({referred.length})</span>
                  </h2>
                  <p className="text-sm text-stone-600">
                    Personal rulings are referred to a scholar. Open one only if you need to write an answer anyway.
                  </p>
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
