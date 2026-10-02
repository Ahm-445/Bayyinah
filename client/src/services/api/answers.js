import { request } from '../transport.js'

/**
 * @returns {Promise<{ selected: true }>}
 * Throws ApiError 409 `already_selected`, or 404 if the answer is not published.
 */
export function selectAnswer(answerId) {
  return request('POST', `/answers/${encodeURIComponent(answerId)}/select`)
}
