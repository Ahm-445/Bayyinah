import { AI_ACTION } from '../../../shared/lib/enums.js'

const SAFETY_STATUS = { ALLOW: 'done', REVIEW: 'warning', BLOCK: 'failed' }
const VERIFICATION_STATUS = { PASS: 'done', NEEDS_REVIEW: 'warning', FAIL: 'failed' }

/**
 * Steps for PipelineTimeline. Uses draft.pipeline when the backend sends it;
 * otherwise derives each stage's outcome from fields api.md does provide
 * (no timings).
 */
export function pipelineSteps(draft) {
  if (draft.pipeline) return draft.pipeline

  const { question, safety, evidence, generatedText, verification, aiAction } = draft
  const stopped = aiAction === AI_ACTION.REFER || safety?.decision === 'BLOCK'
  const retrieved = !stopped

  return [
    {
      stage: 'Classification',
      status: 'done',
      detail: [question.level && `Level ${question.level}`, question.category?.replaceAll('_', ' ')]
        .filter(Boolean)
        .join(' · '),
    },
    {
      stage: 'Safety',
      status: SAFETY_STATUS[safety?.decision] ?? 'skipped',
      detail: safety?.decision?.toLowerCase(),
    },
    {
      stage: 'Retrieval',
      status: retrieved ? 'done' : 'skipped',
      detail: retrieved ? `${evidence.length} source${evidence.length === 1 ? '' : 's'}` : null,
    },
    {
      stage: 'Generation',
      status: generatedText ? 'done' : retrieved && aiAction !== AI_ACTION.CLARIFY ? 'failed' : 'skipped',
      detail: !generatedText && retrieved && aiAction === AI_ACTION.ABSTAIN ? 'insufficient evidence' : null,
    },
    {
      stage: 'Verification',
      status: verification ? VERIFICATION_STATUS[verification.status] ?? 'done' : 'skipped',
      detail: verification?.badge?.label.toLowerCase(),
    },
  ]
}
