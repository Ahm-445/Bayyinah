import { NavLink, Outlet } from 'react-router'
import { useI18n } from '../../i18n/core.js'
import { getAuth } from '../../services/session.js'
import { ROLE } from '../../shared/lib/enums.js'
import { useLogout } from '../useLogout.js'
import AppFooter from './AppFooter.jsx'
import AppHeader from './AppHeader.jsx'

const navClass = ({ isActive }) =>
  isActive
    ? 'inline-flex min-h-9 items-center font-semibold text-brand underline decoration-2 underline-offset-8'
    : 'inline-flex min-h-9 items-center font-semibold text-ink hover:text-accent'

export default function DaeeLayout() {
  const { t } = useI18n()
  const handleLogout = useLogout()
  const user = getAuth()?.user

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader>
        <span dir="auto" className="text-ink-soft">
          {user?.displayName}
        </span>
        <NavLink to="/daee" end className={navClass}>
          {t('nav.queue')}
        </NavLink>
        {user?.role === ROLE.ADMIN && (
          <NavLink to="/admin/eval" className={navClass}>
            {t('nav.evaluation')}
          </NavLink>
        )}
        <button type="button" onClick={handleLogout} className="btn btn-sm btn-dark-outline">
          {t('nav.signOut')}
        </button>
      </AppHeader>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  )
}
