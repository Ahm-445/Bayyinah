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

  return {
    sourceId: evidence.sourceId,
    chunkId: evidence.chunkId,
    sourceTitle:
      evidence.citation.sourceTitle || null,
    reference:
      evidence.citation.reference || null,
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