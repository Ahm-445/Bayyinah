import { httpRequest } from './http.js'

/**
 * The only switch between mock and real API. Everything in services/api
 * calls request(); paths are relative to /api, exactly as in docs/api.md.
 */
export async function request(method, path, options) {
  // Inline env check (not config.useMocks): Vite folds it to a literal, so a
  // real-API build drops the mock adapter chunk and its demo data entirely.
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { mockRequest } = await import('./mocks/adapter.js')
    return mockRequest(method, path, options)
  }
  return httpRequest(method, path, options)
}
