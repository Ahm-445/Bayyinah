import { list, mapCitation } from './common.js'

/** Answer (public shape), docs/api.md 2.3 → UI view model. */
export function mapAnswer(raw) {
  const citations = list(raw.citations).map(mapCitation)
  return {
    id: raw.id,
    daee: { id: raw.daee?.id ?? null, displayName: raw.daee?.displayName ?? 'Dāʿī' },
    finalText: raw.finalText ?? '',
    citations,
    sourceCount: new Set(citations.map((c) => c.key)).size,
    // Kept as data only: the questioner UI must not display it.
    verificationStatus: raw.verificationStatus,
    aiAssisted: Boolean(raw.aiAssisted),
    publishedAt: raw.publishedAt ?? null,
  }
}

/** GET /api/questions/:id/answers */
export function mapAnswerList(raw) {
  return {
    selectedAnswerId: raw?.selectedAnswerId ?? null,
    answers: list(raw?.answers).map(mapAnswer),
  }
}
