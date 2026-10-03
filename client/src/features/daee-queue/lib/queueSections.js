import { AI_ACTION, AI_ISSUE, DRAFT_STATUS } from '../../../shared/lib/enums.js'

/** Level D / REFER: the only drafts kept out of "Needs review". */
export function isReferral(item) {
  return item.level === 'D' || item.aiAction === AI_ACTION.REFER
}

/**
 * Advisory AI issue for a queue item, or null. Uses aiAction when the API
 * sends it (the mock does; pending backend); otherwise derives it:
 * - verification FAIL                          → verification failed
 * - blocked with no verification               → AI couldn't draft
 * - in_review with no verification (no action) → unclear question (CLARIFY)
 */
export function aiIssueOf(item) {
  if (item.aiAction === AI_ACTION.CLARIFY) return AI_ISSUE.CLARIFY
  if (item.verificationStatus === 'FAIL') return AI_ISSUE.VERIFICATION_FAILED
  if (item.aiAction === AI_ACTION.ABSTAIN && !item.verificationStatus) return AI_ISSUE.INSUFFICIENT
  if (item.status === DRAFT_STATUS.BLOCKED && !item.verificationStatus) return AI_ISSUE.INSUFFICIENT
  if (!item.aiAction && item.status === DRAFT_STATUS.IN_REVIEW && !item.verificationStatus) return AI_ISSUE.CLARIFY
  return null
}

const oldestFirst = (a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')

/**
 * "Needs review": every draft a dāʿī can act on, including the ones the AI
 * could not draft (oldest first). "Referred": level D only.
 */
export function splitQueue(queue) {
  const pending = []
  const referred = []
  for (const item of queue) {
    if (isReferral(item)) referred.push(item)
    else pending.push({ ...item, aiIssue: aiIssueOf(item) })
  }
  return { pending: pending.sort(oldestFirst), referred: referred.sort(oldestFirst) }
}
