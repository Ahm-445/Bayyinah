const { createEvidence } = require("../../contracts/evidenceContract");

const INDEX_NAME = "knowledge_chunks_vector_index";
const COLLECTION_NAME = "knowledge_chunks";

function createVectorRetriever({
  db,
  embeddingProvider,
  topK = 5,
}) {
  if (!db || typeof db.collection !== "function") {
    throw new Error("MongoDB database instance is required");
  }

  if (!embeddingProvider || typeof embeddingProvider.embed !== "function") {
    throw new Error("Embedding provider is required");
  }

  const collection = db.collection(COLLECTION_NAME);

  async function retrieve(question) {
    if (!question || typeof question !== "string") {
      throw new Error("Question is required");
    }

    const queryVector = await embeddingProvider.embed(question, {
      inputType: "query",
    });

    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: INDEX_NAME,
            path: "embedding",
            queryVector,
            numCandidates: Math.max(topK * 10, 50),
            limit: topK,
          },
        },
        {
          $project: {
            _id: 0,
            chunkId: 1,
            sourceId: 1,
            text: 1,
            metadata: 1,
            model: 1,
            dimensions: 1,
            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ])
      .toArray();

    return results.map((item) =>
      createEvidence({
        sourceId: item.sourceId,
        chunkId: item.chunkId,
        text: item.text,
        score: item.score,
        citation: {
          sourceId: item.sourceId,
          chunkId: item.chunkId,
          sourceTitle: item.metadata?.title || null,
          reference: item.metadata?.reference || null,
        },
      })
    );
  }

  return {
    retrieve,
  };
}

module.exports = {
  createVectorRetriever,
  INDEX_NAME,
  COLLECTION_NAME,
};
