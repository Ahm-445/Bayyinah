import { useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { logout } from '../../services/api/auth.js'
import { getAuth } from '../../services/session.js'
import { ROLE } from '../../shared/lib/enums.js'
import AppHeader from './AppHeader.jsx'

const navClass = ({ isActive }) =>
  isActive ? 'font-medium text-stone-950' : 'text-stone-600 hover:text-stone-950'

export default function DaeeLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = getAuth()?.user

  function handleLogout() {
    logout()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

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
