import { clearAuth, setAuth } from '../session.js'
import { request } from '../transport.js'

// Account endpoints (team decision 2026-10-03; shapes pending backend confirmation):
//   POST /auth/register { username, password } → 201 { token, user }   questioners only
//   POST /auth/login    { username, password } → { token, user }       all roles
//   GET  /auth/me                              → user
// user = { id, username, displayName, role: 'questioner' | 'daee' | 'admin' }

/** Stores the token on success. @returns {Promise<{ id, username, displayName, role }>} */
export async function login({ username, password }) {
  const { token, user } = await request('POST', '/auth/login', { body: { username, password } })
  setAuth({ token, user })
  return user
}

/** Creates a questioner account and signs in. */
export async function register({ username, password }) {
  const { token, user } = await request('POST', '/auth/register', { body: { username, password } })
  setAuth({ token, user })
  return user
}

export function getMe() {
  return request('GET', '/auth/me')
}

export function logout() {
  clearAuth()
}
