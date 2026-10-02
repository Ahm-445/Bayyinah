import { userMessage } from '../../services/errors.js'

/**
 * Loading / error wrapper for a TanStack query.
 * Renders children(data) once the query has data.
 */
export default function QueryState({ query, notFound, children }) {
  if (query.isPending) {
    return (
      <div role="status" className="animate-pulse space-y-3">
        <div className="h-6 w-1/3 rounded bg-stone-200" />
        <div className="h-32 rounded bg-stone-200" />
        <span className="sr-only">Loading…</span>
      </div>
    )
  }

  if (query.isError) {
    if (query.error?.status === 404 && notFound) return notFound
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p>{userMessage(query.error)}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-2 text-sm font-medium underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return children(query.data)
}
