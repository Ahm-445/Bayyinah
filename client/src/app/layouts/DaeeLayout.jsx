import { NavLink, Outlet } from 'react-router'
import { useI18n } from '../../i18n/core.js'
import { getAuth } from '../../services/session.js'
import { ROLE } from '../../shared/lib/enums.js'
import { useLogout } from '../useLogout.js'
import AppHeader from './AppHeader.jsx'

const navClass = ({ isActive }) =>
  isActive ? 'font-medium text-stone-950' : 'text-stone-600 hover:text-stone-950'

export default function DaeeLayout() {
  const { t } = useI18n()
  const handleLogout = useLogout()
  const user = getAuth()?.user

  return (
    <div className="min-h-screen">
      <AppHeader homeTo="/daee">
        <NavLink to="/daee" end className={navClass}>
          {t('nav.queue')}
        </NavLink>
        {user?.role === ROLE.ADMIN && (
          <NavLink to="/admin/eval" className={navClass}>
            {t('nav.evaluation')}
          </NavLink>
        )}
        <span dir="auto" className="text-stone-500">
          {user?.displayName}
        </span>
        <button type="button" onClick={handleLogout} className="text-stone-600 hover:text-stone-950">
          {t('nav.signOut')}
        </button>
      </AppHeader>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
