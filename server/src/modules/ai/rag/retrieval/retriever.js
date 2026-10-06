const {
  createVectorRetriever,
} = require("./vectorRetriever");

function createRetriever({
  db,
  embeddingProvider,
  topK = 5,
}) {
  if (!db || typeof db.collection !== "function") {
    throw new Error("MongoDB database instance is required");
  }

  if (
    !embeddingProvider ||
    typeof embeddingProvider.embed !== "function"
  ) {
    throw new Error("Embedding provider is required");
  }

  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error("topK must be a positive integer");
  }

  const vectorRetriever = createVectorRetriever({
    db,
    embeddingProvider,
    topK,
  });

  return {
    retrieve: vectorRetriever.retrieve,
  };
}

module.exports = {
  createRetriever,
};