import { useI18n } from '../../i18n/core.js'
import { userMessage } from '../../services/errors.js'

/**
 * Loading / error wrapper for a TanStack query.
 * Renders children(data) once the query has data.
 */
export default function QueryState({ query, notFound, children }) {
  const i18n = useI18n()

  if (query.isPending) {
    return (
      <div role="status" className="animate-pulse space-y-3">
        <div className="h-6 w-1/3 rounded-full bg-black/10" />
        <div className="h-32 rounded-card bg-black/10" />
        <span className="sr-only">{i18n.t('common.loading')}</span>
      </div>
    )
  }

  if (query.isError) {
    if (query.error?.status === 404 && notFound) return notFound
    return (
      <div role="alert" className="rounded-card bg-danger/5 p-5 text-danger ring-1 ring-danger/20">
        <p>{userMessage(query.error, i18n)}</p>
        <button type="button" onClick={() => query.refetch()} className="btn btn-sm btn-danger-outline mt-3 bg-white">
          {i18n.t('common.tryAgain')}
        </button>
      </div>
    )
  }

  return children(query.data)
}
