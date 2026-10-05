import { mapDraft } from '../mappers/draft.js'
import { request } from '../transport.js'

const id = encodeURIComponent

export async function getDraft(draftId) {
  return mapDraft(await request('GET', `/drafts/${id(draftId)}`))
}

/** Saves a new version. Throws ApiError 409 if already approved / rejected. */
export async function updateDraft(draftId, text) {
  return mapDraft(await request('PATCH', `/drafts/${id(draftId)}`, { body: { text } }))
}

/**
 * Publishes in one call (docs/api.md): `text` is the final answer, saved as a
 * version and published together. Without `text` the server publishes the
 * current draft text.
 * @returns {Promise<{ answerId: string }>}
 * Throws ApiError 422 `warnings_not_acknowledged`, 400 empty text, 409 already closed.
 */
export function approveDraft(draftId, { acknowledgeWarnings = false, text } = {}) {
  const body = text === undefined ? { acknowledgeWarnings } : { acknowledgeWarnings, text }
  return request('POST', `/drafts/${id(draftId)}/approve`, { body })
}

/** @returns {Promise<{ status: 'rejected' }>} */
export function rejectDraft(draftId, reason) {
  return request('POST', `/drafts/${id(draftId)}/reject`, { body: { reason } })
}
