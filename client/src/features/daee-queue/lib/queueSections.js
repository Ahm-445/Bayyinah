import { DRAFT_STATUS } from '../../../shared/lib/enums.js'

export const PARKED_REASON = Object.freeze({
  REFERRAL: 'referral',
  CLARIFY: 'clarify',
})

/**
 * Queue items (docs/api.md dashboard) carry no aiAction, so the no-action
 * cases are derived:
 * - level D → referral (api.md 1.3: REFER is level D / high risk)
 * - in_review with no verification → CLARIFY. Per api.md 1.3, in_review only
 *   happens for a generated, verified draft; CLARIFY has no backend rule yet.
 * Revisit if the backend adds aiAction to queue items or a rule for CLARIFY.
 */
export function parkedReason(item) {
  if (item.level === 'D') return PARKED_REASON.REFERRAL
  if (item.status === DRAFT_STATUS.IN_REVIEW && !item.verificationStatus) return PARKED_REASON.CLARIFY
  return null
}

const oldestFirst = (a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')

/** Splits the queue into actionable drafts (oldest first) and parked ones. */
export function splitQueue(queue) {
  const pending = []
  const parked = []
  for (const item of queue) {
    const reason = parkedReason(item)
    if (reason) parked.push({ ...item, parkedReason: reason })
    else pending.push(item)
  }
  return { pending: pending.sort(oldestFirst), parked: parked.sort(oldestFirst) }
}
