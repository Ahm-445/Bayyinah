import { AI_ACTION, AI_ISSUE, DRAFT_STATUS, DRAFT_VIEW } from '../../shared/lib/enums.js'
import { stripMarkdown } from '../../shared/lib/markdown.js'
import { list, mapCitation, mapEvidence, mapPipeline, mapVerification } from './common.js'

/** Advisory reason the AI did not give a usable draft, or null. */
function aiIssueOf(aiAction, generatedText, verification) {
  if (aiAction === AI_ACTION.CLARIFY) return AI_ISSUE.CLARIFY
  if (!generatedText) return AI_ISSUE.INSUFFICIENT
  if (verification?.status === 'FAIL') return AI_ISSUE.VERIFICATION_FAILED
  return null
}

/**
 * Draft (dāʿī view), docs/api.md 2.3 → UI view model.
 * Product rule: the AI never blocks the dāʿī; verification is advisory.
 * A `blocked` status from the API is shown as an AI issue, not a lock.
 */
export function mapDraft(raw) {
  const classification = raw.question?.classification ?? {}
  // The AI sometimes writes Markdown (**bold**, lists): show plain text in the editor,
  // so it is also what gets published (approve sends the editor text).
  const generatedText = raw.generatedText ? stripMarkdown(raw.generatedText) : null
  const status = raw.status
  const isClosed = status === DRAFT_STATUS.APPROVED || status === DRAFT_STATUS.REJECTED
  const isReferral = raw.aiAction === AI_ACTION.REFER || classification.level === 'D'
  const verification = mapVerification(raw.verification)
  const aiIssue = isReferral ? null : aiIssueOf(raw.aiAction, generatedText, verification)

  return {
    id: raw.id,
    status,
    aiAction: raw.aiAction ?? null,
    view: isReferral ? DRAFT_VIEW.REFERRAL : DRAFT_VIEW.REVIEW,
    aiIssue,
    question: {
      id: raw.question?.id,
      text: raw.question?.text ?? '',
      language: raw.question?.language ?? 'en',
      category: classification.category ?? null,
      level: classification.level ?? null,
      risk: classification.risk ?? null,
    },
    safety: raw.safety ?? null,
    generatedText,
    text: raw.text ? stripMarkdown(raw.text) : (generatedText ?? ''),
    versions: list(raw.versions),
    evidence: list(raw.evidence).map(mapEvidence),
    citations: list(raw.citations).map(mapCitation),
    verification,
    requiresAcknowledgement: Boolean(raw.requiresAcknowledgement),
    // AI issue or level D: approving needs "I have reviewed this answer and take responsibility for it".
    requiresResponsibility: Boolean(aiIssue) || isReferral,
    pipeline: mapPipeline(raw.pipeline),
    isClosed,
    // Open drafts are always editable and approvable (text must not be empty);
    // level D only after the dāʿī chooses "Write an answer anyway".
    canEdit: !isClosed,
  }
}
