import { NavLink, Outlet } from 'react-router'
import AppHeader from './AppHeader.jsx'

const navClass = ({ isActive }) =>
  isActive ? 'font-medium text-stone-950' : 'text-stone-600 hover:text-stone-950'

/** Signed-out pages: sign in, register, not found. */
export default function AuthLayout() {
  return (
    <div className="min-h-screen">
      <AppHeader homeTo="/">
        <NavLink to="/login" className={navClass}>
          Sign in
        </NavLink>
        <NavLink to="/register" className={navClass}>
          Register
        </NavLink>
      </AppHeader>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
