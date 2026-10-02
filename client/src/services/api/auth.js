import { clearAuth, setAuth } from '../session.js'
import { request } from '../transport.js'

/** Stores the token on success. @returns {Promise<{ id, displayName, role }>} */
export async function login({ email, password }) {
  const { token, user } = await request('POST', '/auth/login', { body: { email, password } })
  setAuth({ token, user })
  return user
}

export function getMe() {
  return request('GET', '/auth/me')
}

export function logout() {
  clearAuth()
}
