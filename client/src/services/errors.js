/**
 * Every failed request, real or mocked, becomes an ApiError.
 * Backend error body (docs/api.md 2.1): { error: string, code?: string }
 */
export class ApiError extends Error {
  constructor(status, message, code = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function isApiError(error, status, code) {
  if (!(error instanceof ApiError)) return false
  if (status !== undefined && error.status !== status) return false
  if (code !== undefined && error.code !== code) return false
  return true
}

/**
 * Text that is safe to show the user. 4xx messages come from the backend
 * and are user-safe; 5xx and network errors get a generic message.
 */
export function userMessage(error) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
