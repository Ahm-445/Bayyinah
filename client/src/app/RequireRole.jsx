import { Navigate, useLocation } from 'react-router'
import { getAuth } from '../services/session.js'
import { homeFor } from '../shared/lib/roles.js'

/** Signed-out users go to /login; signed-in users with another role go to their own dashboard. */
export default function RequireRole({ roles, children }) {
  const location = useLocation()
  const auth = getAuth()

  if (!auth?.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!roles.includes(auth.user?.role)) {
    return <Navigate to={homeFor(auth.user?.role)} replace />
  }
  return children
}
