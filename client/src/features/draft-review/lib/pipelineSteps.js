import { AI_ACTION } from '../../../shared/lib/enums.js'

const SAFETY_STATUS = { ALLOW: 'done', REVIEW: 'warning', BLOCK: 'failed' }
const VERIFICATION_STATUS = { PASS: 'done', NEEDS_REVIEW: 'warning', FAIL: 'failed' }

/**
 * Steps for PipelineTimeline. Uses draft.pipeline when the backend sends it;
 * otherwise derives each stage's outcome from fields api.md does provide
 * (no timings). Stage names and details are i18n keys, translated by the
 * timeline: details = [{ key, params }].
 */
export function pipelineSteps(draft) {
  if (draft.pipeline) return draft.pipeline

  const { question, safety, evidence, generatedText, verification, aiAction } = draft
  const stopped = aiAction === AI_ACTION.REFER || safety?.decision === 'BLOCK'
  const retrieved = !stopped
  const detail = (key, params) => ({ key, params })

  return [
    {
      stage: 'classification',
      status: 'done',
      details: [
        question.level && detail('level.chip', { level: question.level }),
        question.category && detail(`categories.${question.category}`, { defaultValue: question.category }),
      ].filter(Boolean),
    },
    {
      stage: 'safety',
      status: SAFETY_STATUS[safety?.decision] ?? 'skipped',
      details: safety?.decision ? [detail(`safety.${safety.decision}`)] : [],
    },
    {
      stage: 'retrieval',
      status: retrieved ? 'done' : 'skipped',
      details: retrieved ? [detail('pipeline.sources', { count: evidence.length })] : [],
    },
    {
      stage: 'generation',
      status: generatedText ? 'done' : retrieved && aiAction !== AI_ACTION.CLARIFY ? 'failed' : 'skipped',
      details: !generatedText && retrieved && aiAction === AI_ACTION.ABSTAIN ? [detail('pipeline.insufficient')] : [],
    },
    {
      stage: 'verification',
      status: verification ? VERIFICATION_STATUS[verification.status] ?? 'done' : 'skipped',
      details: verification?.status ? [detail(`verification.${verification.status}`)] : [],
    },
  ]
}
