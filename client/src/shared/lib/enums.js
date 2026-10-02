// Enum values from docs/api.md 2.2 and the AI contract (1.2).

export const QUESTION_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  DRAFTING: 'drafting',
  AWAITING_REVIEW: 'awaiting_review',
  ANSWERED: 'answered',
  REFERRED: 'referred',
  FAILED: 'failed',
})

export const DRAFT_STATUS = Object.freeze({
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  BLOCKED: 'blocked',
})

export const VERIFICATION_STATUS = Object.freeze({
  PASS: 'PASS',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  FAIL: 'FAIL',
})

export const AI_ACTION = Object.freeze({
  ANSWER: 'ANSWER',
  CLARIFY: 'CLARIFY',
  ABSTAIN: 'ABSTAIN',
  REFER: 'REFER',
})

export const ROLE = Object.freeze({
  QUESTIONER: 'questioner',
  DAEE: 'daee',
  ADMIN: 'admin',
})

/** Badge text for verification.status (docs/api.md 2.2). */
export const VERIFICATION_BADGE = Object.freeze({
  PASS: { label: 'Verified', tone: 'success' },
  NEEDS_REVIEW: { label: 'Needs Review', tone: 'warning' },
  FAIL: { label: 'Insufficient Evidence', tone: 'danger' },
})

/** Short descriptions of the A–D levels (ai/contracts/aiTypes.js). */
export const LEVEL_LABEL = Object.freeze({
  A: 'Established information',
  B: 'Explanation and evidence',
  C: 'Sensitive or differing views',
  D: 'Personal ruling (referred)',
})

/**
 * Which screen the dāʿī sees for a draft.
 * - review:       normal editable draft (may still be blocked by a failed citation check)
 * - referral:     level D / REFER, never answered
 * - clarify:      CLARIFY, no backend rule yet (neutral state)
 * - insufficient: ABSTAIN before generation, nothing to edit
 */
export const DRAFT_VIEW = Object.freeze({
  REVIEW: 'review',
  REFERRAL: 'referral',
  CLARIFY: 'clarify',
  INSUFFICIENT: 'insufficient',
})
