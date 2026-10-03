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

// ---------------------------------------------------------------------------
// "My questions": ids of questions asked from this session. Stored with the
// session id, so the list never outlives the session that can open them.

const MY_QUESTIONS_KEY = 'bayyinah.myQuestions'
const MY_QUESTIONS_LIMIT = 20
const CHANGE_EVENT = 'bayyinah:my-questions'
const EMPTY = Object.freeze([])

let cachedRaw
let cachedList = EMPTY

/** @returns {ReadonlyArray<{ id: string, text: string, askedAt: string }>} newest first; stable reference until it changes */
export function getMyQuestions() {
  const raw = read(MY_QUESTIONS_KEY)
  const sessionId = read(SESSION_KEY)
  const cacheKey = `${sessionId}|${raw}`
  if (cacheKey === cachedRaw) return cachedList
  cachedRaw = cacheKey
  try {
    const stored = raw ? JSON.parse(raw) : null
    cachedList = stored && stored.sessionId === sessionId && Array.isArray(stored.items) ? stored.items : EMPTY
  } catch {
    cachedList = EMPTY
  }
  return cachedList
}

export function addMyQuestion({ id, text }) {
  const items = [
    { id, text, askedAt: new Date().toISOString() },
    ...getMyQuestions().filter((item) => item.id !== id),
  ].slice(0, MY_QUESTIONS_LIMIT)
  write(MY_QUESTIONS_KEY, JSON.stringify({ sessionId: getSessionId(), items }))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** For useSyncExternalStore; also fires when another tab changes storage. */
export function subscribeMyQuestions(onChange) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/**
 * Forgets this questioner: drops the session id (a new one is created on the
 * next request) and the "My questions" list with it.
 */
export function clearSession() {
  write(SESSION_KEY, null)
  write(MY_QUESTIONS_KEY, null)
  window.dispatchEvent(new Event(CHANGE_EVENT))
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
