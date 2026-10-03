import { Link } from 'react-router'
import { clearSession } from '../../services/session.js'

async function resetMocks() {
  const { resetMockData } = await import('../../services/mocks/adapter.js')
  resetMockData()
  clearSession() // the reset deletes the questions "My questions" points to
  window.location.reload()
}

export default function AppHeader({ homeTo, children }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link to={homeTo} className="flex items-baseline gap-2 font-semibold text-emerald-800">
          <span>Bayyinah</span>
          <span lang="ar" dir="rtl" className="text-lg leading-none">
            بيّنة
          </span>
        </Link>
        {/* Inline env check so real-API builds drop this and the mock import. */}
        {import.meta.env.VITE_USE_MOCKS === 'true' && (
          <button
            type="button"
            onClick={resetMocks}
            title="Reset mock data to the seed fixtures"
            className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
          >
            Mock API · reset
          </button>
        )}
        <div className="ml-auto flex items-center gap-4 text-sm">{children}</div>
      </div>
    </header>
  )
}
