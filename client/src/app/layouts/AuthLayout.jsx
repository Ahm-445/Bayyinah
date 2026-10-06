import { NavLink, Outlet, useLocation } from 'react-router'
import { useI18n } from '../../i18n/core.js'
import { getAuth } from '../../services/session.js'
import { ROLE } from '../../shared/lib/enums.js'
import { homeFor } from '../../shared/lib/roles.js'
import { useLogout } from '../useLogout.js'
import AppFooter from './AppFooter.jsx'
import AppHeader from './AppHeader.jsx'

/**
 * Public pages: landing, sign in, register, not found. A signed-in visitor
 * (the landing page is open to them too) gets a link to their dashboard
 * and sign out instead of the sign-in links.
 */
export default function AuthLayout() {
  const { t } = useI18n()
  const logout = useLogout()
  useLocation() // re-read the session after signing out on this same page
  const auth = getAuth()
  const user = auth?.token ? auth.user : null

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader>
        {user ? (
          <>
            <span dir="auto" className="text-ink-soft">
              {user.displayName}
            </span>
            <NavLink to={homeFor(user.role)} className="btn btn-sm btn-dark">
              {user.role === ROLE.QUESTIONER ? t('nav.ask') : t('nav.queue')}
            </NavLink>
            <button type="button" onClick={logout} className="btn btn-sm btn-dark-outline">
              {t('nav.signOut')}
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="btn btn-sm btn-dark-outline">
              {t('nav.signIn')}
            </NavLink>
            <NavLink to="/register" className="btn btn-sm btn-dark">
              {t('nav.register')}
            </NavLink>
          </>
        )}
      </AppHeader>
      <main id="main" className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  )
}
