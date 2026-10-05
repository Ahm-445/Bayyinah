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
      // { published, selected, publishedPoints, selectedPoints } or null (older servers).
      scoreBreakdown: stats.scoreBreakdown
        ? {
            published: stats.scoreBreakdown.published ?? 0,
            selected: stats.scoreBreakdown.selected ?? 0,
            publishedPoints: stats.scoreBreakdown.publishedPoints ?? 0,
            selectedPoints: stats.scoreBreakdown.selectedPoints ?? 0,
          }
        : null,
    },
    queue: list(raw?.queue).map((item) => ({
      draftId: item.draftId,
      questionId: item.questionId,
      questionText: item.questionText ?? '',
      level: item.level ?? null,
      // Optional (not in api.md; the mock sends it): lets the queue label AI issues exactly.
      aiAction: item.aiAction ?? null,
      verificationStatus: item.verificationStatus ?? null,
      status: item.status,
      createdAt: item.createdAt ?? null,
    })),
  }
}
