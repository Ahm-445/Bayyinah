import { Navigate, useLocation } from 'react-router'
import { getAuth } from '../services/session.js'

/** Sends signed-out users to /login, and wrong-role users away. */
export default function RequireRole({ roles, children }) {
  const location = useLocation()
  const auth = getAuth()

  if (!auth?.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!roles.includes(auth.user?.role)) {
    return <Navigate to="/ask" replace />
  }
  return children
}
