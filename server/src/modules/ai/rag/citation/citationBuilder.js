/**
 * Builds a citation object from retrieved evidence.
 *
 * The citation keeps the generated answer traceable
 * to the exact source chunk used by the RAG system.
 *
 * Important:
 * A citation identifies the source.
 * It does NOT by itself prove that the generated claim
 * is correctly supported. That is handled later by
 * citation and evidence verification.
 *
 * @param {Object} evidence
 * @returns {Object}
 */
function buildCitation(evidence) {
  if (!evidence || typeof evidence !== "object") {
    throw new Error("Evidence is required");
  }

  if (!evidence.sourceId || typeof evidence.sourceId !== "string") {
    throw new Error("Evidence sourceId is required");
  }

  if (!evidence.chunkId || typeof evidence.chunkId !== "string") {
    throw new Error("Evidence chunkId is required");
  }

  if (!evidence.text || typeof evidence.text !== "string") {
    throw new Error("Evidence text is required");
  }

  if (!evidence.citation || typeof evidence.citation !== "object") {
    throw new Error("Evidence citation is required");
  }

  const metadata = evidence.citation;

  return {
    sourceId: evidence.sourceId,
    chunkId: evidence.chunkId,
    sourceTitle: metadata.sourceTitle || metadata.title || null,
    sourceUrl: metadata.sourceUrl || metadata.url || metadata.source || null,
    sourceType: metadata.sourceType || null,
    category: metadata.category || null,
    language: metadata.language || null,
    version: metadata.version || metadata.sourceVersion || null,
    license: metadata.license || null,
    usageBasis: metadata.usageBasis || null,
    reference: metadata.reference || null,
    author: metadata.author || null,
    volume: metadata.volume || null,
    pageNumber: metadata.pageNumber ?? metadata.page ?? null,
    hadithCollection: metadata.hadithCollection || metadata.collection || null,
    hadithNumber: metadata.hadithNumber || null,
    hadithGrade: metadata.hadithGrade || metadata.grade || null,
    gradingSource: metadata.gradingSource || null,
    surahNumber: metadata.surahNumber ?? null,
    surahName: metadata.surahName || null,
    ayahNumber: metadata.ayahNumber ?? null,
  };
}

/**
 * Builds citations from multiple evidence items.
 *
 * @param {Object[]} evidence
 * @returns {Object[]}
 */
function buildCitations(evidence) {
  if (!Array.isArray(evidence)) {
    throw new Error("Evidence must be an array");
  }

  return evidence.map(buildCitation);
}

module.exports = {
  buildCitation,
  buildCitations,
};
