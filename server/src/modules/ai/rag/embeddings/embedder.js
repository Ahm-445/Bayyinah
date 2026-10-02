/**
 * Embedding Provider Contract
 *
 * The rest of the RAG system should not depend on
 * a specific embedding provider.
 *
 * Later, a real provider can implement this contract.
 */

/**
 * Validates an embedding vector.
 *
 * @param {number[]} vector
 * @returns {number[]}
 */
function validateEmbedding(vector) {
  if (!Array.isArray(vector)) {
    throw new Error("Embedding must be an array");
  }

  if (vector.length === 0) {
    throw new Error("Embedding vector cannot be empty");
  }

  for (const value of vector) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(
        "Embedding vector must contain only valid numbers"
      );
    }
  }

  return vector;
}

/**
 * Creates an embedding provider interface.
 *
 * A real provider must implement:
 *
 * embed(text) -> Promise<number[]>
 *
 * @param {Object} provider
 * @returns {Object}
 */
function createEmbedder(provider) {
  if (!provider || typeof provider !== "object") {
    throw new Error("Embedding provider is required");
  }

  if (typeof provider.embed !== "function") {
    throw new Error(
      "Embedding provider must implement embed(text)"
    );
  }

  return {
    async embed(text) {
      if (!text || typeof text !== "string") {
        throw new Error("Text is required for embedding");
      }

      const vector = await provider.embed(text);

      return validateEmbedding(vector);
    },
  };
}

module.exports = {
  createEmbedder,
  validateEmbedding,
};