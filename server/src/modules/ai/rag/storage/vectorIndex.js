const INDEX_NAME = "knowledge_chunks_vector_index";

async function createVectorIndex(db) {
  if (!db || typeof db.collection !== "function") {
    throw new Error("MongoDB database instance is required");
  }

  const collection = db.collection("knowledge_chunks");

  const indexDefinition = {
    name: INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: 1024,
          similarity: "cosine",
        },
      ],
    },
  };

  const result = await collection.createSearchIndex(indexDefinition);

  return result;
}

module.exports = {
  INDEX_NAME,
  createVectorIndex,
};
