import { stripMarkdown } from '../../shared/lib/markdown.js'
import { list, mapCitation } from './common.js'

/**
 * Answer (public shape), docs/api.md 2.3 → UI view model.
 * Citations are kept as data only: the questioner never sees a sources list,
 * a source count or verification status. The dāʿī cites sources inside the text.
 */
export function mapAnswer(raw) {
  return {
    id: raw.id,
    daee: { id: raw.daee?.id ?? null, displayName: raw.daee?.displayName ?? 'Dāʿī' },
    // Defensive: never show Markdown syntax to the questioner.
    finalText: stripMarkdown(raw.finalText ?? ''),
    citations: list(raw.citations).map(mapCitation),
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
