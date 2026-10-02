/**
 * Creates a normalized evidence object returned by the RAG layer.
 *
 * Evidence represents a piece of approved source material
 * retrieved for a specific question.
 *
 * Important:
 * The retrieval score indicates relevance to the query.
 * It does NOT indicate religious or scholarly correctness.
 *
 * @param {Object} input
 * @param {string} input.sourceId
 * @param {string} input.chunkId
 * @param {string} input.text
 * @param {number} input.score
 * @param {Object} input.citation
 * @returns {Object}
 */
function createEvidence({
  sourceId,
  chunkId,
  text,
  score,
  citation,
}) {
  if (!sourceId || typeof sourceId !== "string") {
    throw new Error("sourceId is required");
  }

  if (!chunkId || typeof chunkId !== "string") {
    throw new Error("chunkId is required");
  }

  if (!text || typeof text !== "string") {
    throw new Error("Evidence text is required");
  }

  if (typeof score !== "number" || Number.isNaN(score)) {
    throw new Error("Evidence score must be a valid number");
  }

  if (score < 0 || score > 1) {
    throw new Error("Evidence score must be between 0 and 1");
  }

  if (!citation || typeof citation !== "object") {
    throw new Error("citation is required");
  }

  return {
    sourceId,
    chunkId,
    text: text.trim(),
    score,
    citation,
  };
}

module.exports = {
  createEvidence,
};