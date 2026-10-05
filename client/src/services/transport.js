import { config } from './config.js'
import { httpRequest } from './http.js'

/**
 * The only switch between mock and real API. Everything in services/api
 * calls request(); paths are relative to /api, exactly as in docs/api.md.
 * The mock adapter is loaded lazily so it stays out of the real-API bundle.
 */
export async function request(method, path, options) {
  if (config.useMocks) {
    const { mockRequest } = await import('./mocks/adapter.js')
    return mockRequest(method, path, options)
  }
  return httpRequest(method, path, options)
}
