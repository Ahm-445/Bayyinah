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
 * @returns {Promise<{ answerId: string }>}
 * Throws ApiError 422 `blocked` or 422 `warnings_not_acknowledged`.
 */
export function approveDraft(draftId, { acknowledgeWarnings = false } = {}) {
  return request('POST', `/drafts/${id(draftId)}/approve`, { body: { acknowledgeWarnings } })
}

/** @returns {Promise<{ status: 'rejected' }>} */
export function rejectDraft(draftId, reason) {
  return request('POST', `/drafts/${id(draftId)}/reject`, { body: { reason } })
}
