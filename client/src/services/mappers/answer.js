import { markerIds } from '../../shared/lib/citations.js'
import { list, mapCitation } from './common.js'

/** Answer (public shape), docs/api.md 2.3 → UI view model. */
export function mapAnswer(raw) {
  const finalText = raw.finalText ?? ''
  // Sources follow the text: only citations whose [[chunkId]] marker is still
  // in the final text are shown, in order of appearance. The mock (and, pending
  // agreement, the backend) rebuilds citations on approve; this guards the
  // questioner view if a stale list ever comes back.
  const byId = new Map(list(raw.citations).map((c) => [c.chunkId, c]))
  const citations = markerIds(finalText)
    .filter((id) => byId.has(id))
    .map((id) => mapCitation(byId.get(id)))

  return {
    id: raw.id,
    daee: { id: raw.daee?.id ?? null, displayName: raw.daee?.displayName ?? 'Dāʿī' },
    finalText,
    citations,
    sourceCount: citations.length,
    // Kept as data only: the questioner UI must not display it.
    verificationStatus: raw.verificationStatus,
    // "Prepared with AI assistance" only while at least one AI-retrieved source is still cited.
    aiAssisted: citations.length > 0,
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
