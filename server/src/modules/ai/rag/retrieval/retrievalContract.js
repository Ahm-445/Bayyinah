const { createEvidence } = require("../../contracts/evidenceContract");

/**
 * Creates normalized evidence from a vector-search result.
 *
 * Important:
 * The score represents retrieval relevance.
 * It does NOT represent scholarly correctness.
 *
 * @param {Object} result
 * @param {string} result.sourceId
 * @param {string} result.chunkId
 * @param {string} result.text
 * @param {number} result.score
 * @param {Object} result.citation
 * @returns {Object}
 */
function createRetrievedEvidence(result) {
  if (!result || typeof result !== "object") {
    throw new Error("Retrieval result is required");
  }

  return createEvidence({
    sourceId: result.sourceId,
    chunkId: result.chunkId,
    text: result.text,
    score: result.score,
    citation: result.citation,
  });
}

/**
 * Normalizes multiple vector-search results.
 *
 * @param {Object[]} results
 * @returns {Object[]}
 */
function createRetrievedEvidenceList(results) {
  if (!Array.isArray(results)) {
    throw new Error("Retrieval results must be an array");
  }

  return results.map(createRetrievedEvidence);
}

module.exports = {
  createRetrievedEvidence,
  createRetrievedEvidenceList,
};