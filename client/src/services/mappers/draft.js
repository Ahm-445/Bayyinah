import { AI_ACTION, DRAFT_STATUS, DRAFT_VIEW } from '../../shared/lib/enums.js'
import { list, mapCitation, mapEvidence, mapPipeline, mapVerification } from './common.js'

function draftView(aiAction, level, generatedText) {
  if (aiAction === AI_ACTION.REFER || level === 'D') return DRAFT_VIEW.REFERRAL
  if (aiAction === AI_ACTION.CLARIFY) return DRAFT_VIEW.CLARIFY
  if (!generatedText) return DRAFT_VIEW.INSUFFICIENT
  return DRAFT_VIEW.REVIEW
}

/** Draft (dāʿī view), docs/api.md 2.3 → UI view model. */
export function mapDraft(raw) {
  const classification = raw.question?.classification ?? {}
  const generatedText = raw.generatedText ?? null
  const status = raw.status
  const isBlocked = status === DRAFT_STATUS.BLOCKED
  const isClosed = status === DRAFT_STATUS.APPROVED || status === DRAFT_STATUS.REJECTED
  const view = draftView(raw.aiAction, classification.level, generatedText)

  return {
    id: raw.id,
    status,
    aiAction: raw.aiAction ?? null,
    view,
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
    text: raw.text ?? generatedText ?? '',
    versions: list(raw.versions),
    evidence: list(raw.evidence).map(mapEvidence),
    citations: list(raw.citations).map(mapCitation),
    verification: mapVerification(raw.verification),
    requiresAcknowledgement: Boolean(raw.requiresAcknowledgement),
    pipeline: mapPipeline(raw.pipeline),
    isBlocked,
    isClosed,
    canEdit: view === DRAFT_VIEW.REVIEW && !isBlocked && !isClosed,
    // The backend enforces this too (422 blocked / warnings_not_acknowledged).
    canApprove: status === DRAFT_STATUS.IN_REVIEW && view === DRAFT_VIEW.REVIEW,
  }
}
