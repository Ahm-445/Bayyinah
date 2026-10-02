import { VERIFICATION_BADGE } from '../../shared/lib/enums.js'
import { list } from './common.js'

/** GET /api/daee/dashboard → UI view model. */
export function mapDashboard(raw) {
  const stats = raw?.stats ?? {}
  return {
    stats: {
      pending: stats.pending ?? 0,
      approved: stats.approved ?? 0,
      rejected: stats.rejected ?? 0,
      referred: stats.referred ?? 0,
      score: stats.score ?? 0,
    },
    queue: list(raw?.queue).map((item) => ({
      draftId: item.draftId,
      questionId: item.questionId,
      questionText: item.questionText ?? '',
      level: item.level ?? null,
      verificationStatus: item.verificationStatus ?? null,
      badge: VERIFICATION_BADGE[item.verificationStatus] ?? null,
      status: item.status,
      createdAt: item.createdAt ?? null,
    })),
  }
}
