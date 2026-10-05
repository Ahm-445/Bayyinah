// Dāʿī scoring rules (proposed, PENDING TEAM AGREEMENT and backend confirmation).
// The frontend only displays the score the API returns; these values exist
// only in the mock, in this one place, so they are easy to change.
export const SCORING = Object.freeze({
  PUBLISHED_ANSWER: 1, // each answer the dāʿī publishes
  SELECTED_ANSWER: 10, // each time a questioner selects the dāʿī's answer
})

/**
 * Deterministic score breakdown, recomputed from the data on every read (never
 * stored), in the backend's shape: stats.scoreBreakdown (docs/api.md 3).
 */
export function scoreBreakdownFor(userId, { answers, questions }) {
  const published = answers.filter((a) => a.daee?.id === userId)
  const publishedIds = new Set(published.map((a) => a.id))
  const selected = questions.filter((q) => q._selectedAnswerId && publishedIds.has(q._selectedAnswerId))
  return {
    published: published.length,
    selected: selected.length,
    publishedPoints: published.length * SCORING.PUBLISHED_ANSWER,
    selectedPoints: selected.length * SCORING.SELECTED_ANSWER,
  }
}
