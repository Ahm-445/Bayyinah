import { NavLink, Outlet } from 'react-router'
import { useI18n } from '../../i18n/core.js'
import AppHeader from './AppHeader.jsx'

const navClass = ({ isActive }) =>
  isActive ? 'font-medium text-stone-950' : 'text-stone-600 hover:text-stone-950'

/** Signed-out pages: sign in, register, not found. */
export default function AuthLayout() {
  const { t } = useI18n()
  return (
    <div className="min-h-screen">
      <AppHeader homeTo="/">
        <NavLink to="/login" className={navClass}>
          {t('nav.signIn')}
        </NavLink>
        <NavLink to="/register" className={navClass}>
          {t('nav.register')}
        </NavLink>
      </AppHeader>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
