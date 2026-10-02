import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

export default function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'An unexpected error occurred.'

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-stone-600">{message}</p>
      <Link to="/" className="mt-6 inline-block text-emerald-700 underline">
        Back to start
      </Link>
    </div>
  )
}
