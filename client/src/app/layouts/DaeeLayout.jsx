import { NavLink, Outlet } from 'react-router'
import { getAuth } from '../../services/session.js'
import { ROLE } from '../../shared/lib/enums.js'
import { useLogout } from '../useLogout.js'
import AppHeader from './AppHeader.jsx'

const navClass = ({ isActive }) =>
  isActive ? 'font-medium text-stone-950' : 'text-stone-600 hover:text-stone-950'

export default function DaeeLayout() {
  const handleLogout = useLogout()
  const user = getAuth()?.user

  return (
    <div className="min-h-screen">
      <AppHeader homeTo="/daee">
        <NavLink to="/daee" end className={navClass}>
          Queue
        </NavLink>
        {user?.role === ROLE.ADMIN && (
          <NavLink to="/admin/eval" className={navClass}>
            Evaluation
          </NavLink>
        )}
        <span className="text-stone-500">{user?.displayName}</span>
        <button type="button" onClick={handleLogout} className="text-stone-600 hover:text-stone-950">
          Sign out
        </button>
      </AppHeader>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
