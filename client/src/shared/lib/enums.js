// Enum values from docs/api.md 2.2 and the AI contract (1.2).

export const QUESTION_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  DRAFTING: 'drafting',
  AWAITING_REVIEW: 'awaiting_review',
  ANSWERED: 'answered',
  REFERRED: 'referred',
  FAILED: 'failed',
})

/** Tone of the questioner-facing status chip (text: i18n questionStatus.<status>). */
export const QUESTION_STATUS_TONE = Object.freeze({
  submitted: 'neutral',
  drafting: 'neutral',
  awaiting_review: 'warning',
  answered: 'success',
  referred: 'neutral',
  failed: 'danger',
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

/**
 * Badge tone for verification.status (text: i18n verification.<status>).
 * Wording: FAIL is "Verification failed" (a draft exists and failed);
 * "Insufficient evidence" is reserved for AI_ISSUE.INSUFFICIENT (no draft).
 */
export const VERIFICATION_TONE = Object.freeze({
  PASS: 'success',
  NEEDS_REVIEW: 'warning',
  FAIL: 'danger',
})

/**
 * Which screen the dāʿī sees for a draft.
 * - review:   the editor (AI draft, or empty when the AI did not draft)
 * - referral: level D / REFER, referral notice first ("Write an answer anyway" optional)
 */
export const DRAFT_VIEW = Object.freeze({
  REVIEW: 'review',
  REFERRAL: 'referral',
})

/**
 * Why the AI could not produce a usable draft (text: i18n aiIssue.<value>).
 * Advisory only: the AI never blocks the dāʿī, but approving needs an
 * explicit responsibility checkbox.
 */
export const AI_ISSUE = Object.freeze({
  INSUFFICIENT: 'insufficient', // ABSTAIN before generation: no draft ("Insufficient evidence")
  VERIFICATION_FAILED: 'verification_failed', // draft exists, verification FAIL ("Verification failed")
  CLARIFY: 'clarify', // question too unclear: no draft ("Unclear question")
})

/**
 * Level D override: lets a dāʿī "Write an answer anyway" behind a strong
 * warning. The team may remove this; set to false to hide it everywhere.
 */
export const ALLOW_LEVEL_D_OVERRIDE = true

