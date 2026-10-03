// Enum values from docs/api.md 2.2 and the AI contract (1.2).

export const QUESTION_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  DRAFTING: 'drafting',
  AWAITING_REVIEW: 'awaiting_review',
  ANSWERED: 'answered',
  REFERRED: 'referred',
  FAILED: 'failed',
})

/** Question status as the questioner sees it. */
export const QUESTION_STATUS_LABEL = Object.freeze({
  submitted: { label: 'Being prepared', tone: 'neutral' },
  drafting: { label: 'Being prepared', tone: 'neutral' },
  awaiting_review: { label: 'In review', tone: 'warning' },
  answered: { label: 'Answered', tone: 'success' },
  referred: { label: 'Referred to a scholar', tone: 'neutral' },
  failed: { label: 'Could not be processed', tone: 'danger' },
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
 * - review:   the editor (AI draft, or empty when the AI did not draft)
 * - referral: level D / REFER, referral notice first ("Write an answer anyway" optional)
 */
export const DRAFT_VIEW = Object.freeze({
  REVIEW: 'review',
  REFERRAL: 'referral',
})

/**
 * Why the AI could not produce a usable draft. Advisory only: the AI never
 * blocks the dāʿī, but approving needs an explicit responsibility checkbox.
 */
export const AI_ISSUE = Object.freeze({
  INSUFFICIENT: 'insufficient', // ABSTAIN before generation: no draft
  VERIFICATION_FAILED: 'verification_failed', // draft exists, verification FAIL
  CLARIFY: 'clarify', // question too unclear: no draft
})

/** Queue / review labels for each AI issue. */
export const AI_ISSUE_LABEL = Object.freeze({
  insufficient: "AI couldn't draft",
  verification_failed: 'Verification failed',
  clarify: 'Unclear question',
})

/**
 * Level D override: lets a dāʿī "Write an answer anyway" behind a strong
 * warning. The team may remove this; set to false to hide it everywhere.
 */
export const ALLOW_LEVEL_D_OVERRIDE = true
