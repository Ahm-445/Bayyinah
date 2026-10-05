// Signed-in account (questioner, dāʿī or admin). Questions are owned by the
// account, so there is no anonymous session id any more.

const AUTH_KEY = 'bayyinah.auth'

// localStorage can throw (private mode, blocked storage); fall back to memory.
const memory = new Map()

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    if (value === null) memory.delete(key)
    else memory.set(key, value)
  }
}

/** @returns {{ token: string, user: { id, username, displayName, role } } | null} */
export function getAuth() {
  const raw = read(AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAuth(auth) {
  write(AUTH_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  write(AUTH_KEY, null)
}
