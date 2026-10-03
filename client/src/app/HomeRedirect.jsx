import { Navigate } from 'react-router'
import { getAuth } from '../services/session.js'
import { homeFor } from '../shared/lib/roles.js'

/** "/": signed-in users go to their dashboard, everyone else to /login. */
export default function HomeRedirect() {
  const auth = getAuth()
  return <Navigate to={auth?.token ? homeFor(auth.user?.role) : '/login'} replace />
}
