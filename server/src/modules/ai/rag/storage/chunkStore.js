const COLLECTION_NAME = "knowledge_chunks";

function createChunkStore(db) {
  if (!db || typeof db.collection !== "function") {
    throw new Error("MongoDB database instance is required");
  }

  const collection = db.collection(COLLECTION_NAME);

  async function insertChunk(chunk) {
    if (!chunk || typeof chunk !== "object") {
      throw new Error("Chunk is required");
    }

    if (!chunk.chunkId) {
      throw new Error("chunkId is required");
    }

    if (!chunk.sourceId) {
      throw new Error("sourceId is required");
    }

    if (!chunk.text) {
      throw new Error("Chunk text is required");
    }

    if (!Array.isArray(chunk.embedding)) {
      throw new Error("Chunk embedding is required");
    }

    const document = {
      chunkId: chunk.chunkId,
      sourceId: chunk.sourceId,
      text: chunk.text,
      metadata: chunk.metadata || {},
      embedding: chunk.embedding,
      model: chunk.model || null,
      dimensions: chunk.dimensions || chunk.embedding.length,
      createdAt: new Date(),
    };

    await collection.updateOne(
      { chunkId: document.chunkId },
      { $set: document },
      { upsert: true }
    );

    return document;
  }

  async function findByChunkId(chunkId) {
    if (!chunkId || typeof chunkId !== "string") {
      throw new Error("chunkId is required");
    }

    return collection.findOne({ chunkId });
  }

  async function countChunks() {
    return collection.countDocuments();
  }

  return {
    insertChunk,
    findByChunkId,
    countChunks,
  };
}

module.exports = {
  COLLECTION_NAME,
  createChunkStore,
};
