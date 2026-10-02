const SESSION_KEY = 'bayyinah.sessionId'
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

// crypto.randomUUID only exists in secure contexts (https / localhost),
// not when the demo is opened over a LAN IP.
function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Anonymous questioner id, sent as X-Session-Id (docs/api.md 2.1). */
export function getSessionId() {
  let id = read(SESSION_KEY)
  if (!id) {
    id = uuid()
    write(SESSION_KEY, id)
  }
  return id
}

/** @returns {{ token: string, user: { id, displayName, role } } | null} */
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
