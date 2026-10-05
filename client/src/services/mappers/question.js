import { QUESTION_STATUS } from '../../shared/lib/enums.js'

const PROCESSING = new Set([QUESTION_STATUS.SUBMITTED, QUESTION_STATUS.DRAFTING])

/** GET /api/questions/:id → UI view model. */
export function mapQuestion(raw) {
  return {
    id: raw.id,
    text: raw.text ?? '',
    language: raw.language ?? 'en',
    status: raw.status,
    category: raw.classification?.category ?? null,
    level: raw.classification?.level ?? null,
    createdAt: raw.createdAt ?? null,
    // Keep polling while true (docs/api.md: every 2–3 s).
    isProcessing: PROCESSING.has(raw.status),
  }
}
