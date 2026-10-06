import { Link, NavLink, Outlet, useLocation } from 'react-router'
import QuestionHistory from '../../features/question-history/components/QuestionHistory.jsx'
import { useI18n } from '../../i18n/core.js'
import { getAuth } from '../../services/session.js'
import { useLogout } from '../useLogout.js'
import AppFooter from './AppFooter.jsx'
import AppHeader from './AppHeader.jsx'

const navClass = ({ isActive }) =>
  isActive
    ? 'inline-flex min-h-9 items-center font-semibold text-brand underline decoration-2 underline-offset-8'
    : 'inline-flex min-h-9 items-center font-semibold text-ink hover:text-accent'

/**
 * Questioner dashboard: the main area (ask box, or an open question) with
 * the question history as a sidebar at the start side (left in English,
 * right in Arabic: grid columns follow the document direction). On narrow
 * screens the sidebar stacks under the main area.
 */
export default function QuestionerLayout() {
  const { t } = useI18n()
  const logout = useLogout()
  const user = getAuth()?.user
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader>
        <span dir="auto" className="text-ink-soft">
          {user?.displayName}
        </span>
        <NavLink to="/ask" className={navClass}>
          {t('nav.ask')}
        </NavLink>
        <button type="button" onClick={logout} className="btn btn-sm btn-dark-outline">
          {t('nav.signOut')}
        </button>
      </AppHeader>
      <div className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-6 px-4 py-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <main id="main" className="min-w-0">
          <Outlet />
        </main>
        <aside className="lg:order-first">
          <QuestionHistory />
        </aside>
      </div>
      {/* Floating shortcut back to the ask box from an open question. */}
      {pathname !== '/ask' && (
        <Link
          to="/ask"
          aria-label={t('nav.ask')}
          title={t('nav.ask')}
          className="fixed end-5 bottom-5 z-10 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-float transition-all duration-200 hover:bg-brand active:scale-95 active:shadow-none"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      )}
      <AppFooter />
    </div>
  )
}
