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

const STATUS_KEY = {
  0: 'errors.network',
  400: 'errors.badRequest',
  401: 'errors.unauthorized',
  403: 'errors.forbidden',
  404: 'errors.notFound',
  409: 'errors.conflict',
  422: 'errors.unprocessable',
}

/**
 * Text that is safe to show the user, in the UI language (`i18n` from useI18n()).
 * Known error codes are translated. In English, 4xx messages from the backend
 * are shown as sent (docs/api.md: they are user-safe); in Arabic a translated
 * message is picked by status. 5xx and unknown errors get a generic message.
 */
export function userMessage(error, { t, lang }) {
  if (!(error instanceof ApiError)) return t('errors.generic')
  if (error.code) {
    const byCode = t(`errors.codes.${error.code}`, { defaultValue: '' })
    if (byCode) return byCode
  }
  if (error.status >= 400 && error.status < 500 && lang === 'en' && error.message) return error.message
  return t(STATUS_KEY[error.status] ?? 'errors.generic')
}
