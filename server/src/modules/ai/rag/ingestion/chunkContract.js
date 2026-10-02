/**
 * Creates a normalized RAG chunk object.
 *
 * A chunk is a small piece of text extracted from
 * an approved Islamic source.
 *
 * Important:
 * Every chunk must remain traceable to its original source.
 *
 * @param {Object} input
 * @param {string} input.chunkId
 * @param {string} input.sourceId
 * @param {string} input.text
 * @param {Object} input.metadata
 * @returns {Object}
 */
function createChunk({
  chunkId,
  sourceId,
  text,
  metadata = {},
}) {
  if (!chunkId || typeof chunkId !== "string") {
    throw new Error("chunkId is required");
  }

  if (!sourceId || typeof sourceId !== "string") {
    throw new Error("sourceId is required");
  }

  if (!text || typeof text !== "string") {
    throw new Error("Chunk text is required");
  }

  if (!metadata || typeof metadata !== "object") {
    throw new Error("metadata must be an object");
  }

  return {
    chunkId,
    sourceId,
    text: text.trim(),
    metadata,
  };
}

module.exports = {
  createChunk,
};