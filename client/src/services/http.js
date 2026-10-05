import { config } from './config.js'
import { ApiError, parseRetryAfter } from './errors.js'
import { clearAuth, getAuth } from './session.js'

/** Real backend transport. */
export async function httpRequest(method, path, { body } = {}) {
  const headers = { Accept: 'application/json' }
  const auth = getAuth()
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server.', 'network_error')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) clearAuth()
    throw new ApiError(
      response.status,
      data?.error || response.statusText || 'Request failed',
      data?.code ?? null,
      // Exposed by the backend's CORS config (docs/api.md 1).
      response.status === 429 ? parseRetryAfter(response.headers.get('Retry-After')) : null,
    )
  }

  return data
}
