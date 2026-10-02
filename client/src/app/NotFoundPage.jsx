import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link to="/ask" className="mt-6 inline-block text-emerald-700 underline">
        Ask a question
      </Link>
    </div>
  )
}
