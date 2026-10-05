import { NavLink, Outlet } from 'react-router'
import QuestionHistory from '../../features/question-history/components/QuestionHistory.jsx'
import { useI18n } from '../../i18n/core.js'
import { getAuth } from '../../services/session.js'
import { useLogout } from '../useLogout.js'
import AppHeader from './AppHeader.jsx'

const navClass = ({ isActive }) =>
  isActive ? 'font-medium text-stone-950' : 'text-stone-600 hover:text-stone-950'

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

  return (
    <div className="min-h-screen">
      <AppHeader homeTo="/ask">
        <NavLink to="/ask" className={navClass}>
          {t('nav.ask')}
        </NavLink>
        <span dir="auto" className="text-stone-500">
          {user?.displayName}
        </span>
        <button type="button" onClick={logout} className="text-stone-600 hover:text-stone-950">
          {t('nav.signOut')}
        </button>
      </AppHeader>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <main className="min-w-0">
          <Outlet />
        </main>
        <aside className="lg:order-first">
          <QuestionHistory />
        </aside>
      </div>
    </div>
  )
}
