import { ROLE } from './enums.js'

/** Where each role lands after signing in (and when it opens a page it cannot use). */
export function homeFor(role) {
  if (role === ROLE.QUESTIONER) return '/ask'
  if (role === ROLE.DAEE || role === ROLE.ADMIN) return '/daee'
  return '/login'
}
