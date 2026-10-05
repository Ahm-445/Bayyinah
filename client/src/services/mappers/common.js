
const list = (value) => (Array.isArray(value) ? value : [])

export function mapCitation(raw) {
  return {
    key: `${raw.sourceId}:${raw.chunkId}`,
    sourceId: raw.sourceId,
    chunkId: raw.chunkId,
    sourceTitle: raw.sourceTitle ?? null,
    reference: raw.reference ?? null,
    // Not in api.md today; used only if the backend ever sends them.
    text: raw.text ?? null,
    sourceType: raw.sourceType ?? null,
    surahNumber: raw.surahNumber ?? null,
    ayahNumber: raw.ayahNumber ?? null,
  }
}

export function mapEvidence(raw) {
  const citation = raw.citation ?? {}
  return {
    key: `${raw.sourceId}:${raw.chunkId}`,
    sourceId: raw.sourceId,
    chunkId: raw.chunkId,
    text: raw.text ?? '',
    score: typeof raw.score === 'number' ? raw.score : null,
    sourceTitle: citation.sourceTitle ?? null,
    reference: citation.reference ?? null,
    // Optional: not in api.md today.
    sourceType: citation.sourceType ?? null,
    surahNumber: citation.surahNumber ?? null,
    ayahNumber: citation.ayahNumber ?? null,
  }
}

export function mapVerification(raw) {
  if (!raw) return null
  return {
    status: raw.status,
    citationValid: Boolean(raw.citationValid),
    evidenceSupported: Boolean(raw.evidenceSupported),
    unsupportedClaims: list(raw.unsupportedClaims),
    missingCitations: list(raw.missingCitations),
    riskFlags: list(raw.riskFlags),
    warnings: list(raw.warnings),
  }
}

/** Optional: not in api.md today. Returns null when absent. */
export function mapPipeline(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null
  return raw.map((step) => ({
    stage: step.stage,
    status: step.status ?? 'done',
    ms: Number.isFinite(step.ms) ? step.ms : null,
  }))
}

export { list }
