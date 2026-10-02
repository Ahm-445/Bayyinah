function validateEmbedding(vector) {
  if (!Array.isArray(vector)) {
    throw new Error("Embedding must be an array");
  }

  if (vector.length === 0) {
    throw new Error("Embedding cannot be empty");
  }

  if (!vector.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("Embedding must contain only finite numbers");
  }

  return vector;
}

function createEmbeddingProvider(provider) {
  if (!provider || typeof provider !== "object") {
    throw new Error("Embedding provider is required");
  }

  if (typeof provider.embed !== "function") {
    throw new Error("Embedding provider must implement embed(text)");
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
  createEmbeddingProvider,
  validateEmbedding,
};
