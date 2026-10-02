const {
  createEmbedder,
} = require("./embedder");

/**
 * Creates an embedding record for a single chunk.
 *
 * The embedding keeps the chunk identity and source identity
 * so that retrieved vectors can later be converted back
 * into traceable evidence.
 *
 * @param {Object} chunk
 * @param {Object} embedder
 * @param {string} model
 * @returns {Object}
 */
async function embedChunk(chunk, embedder, model) {
  if (!chunk || typeof chunk !== "object") {
    throw new Error("Chunk is required");
  }

  if (!chunk.chunkId || typeof chunk.chunkId !== "string") {
    throw new Error("chunkId is required");
  }

  if (!chunk.sourceId || typeof chunk.sourceId !== "string") {
    throw new Error("sourceId is required");
  }

  if (!chunk.text || typeof chunk.text !== "string") {
    throw new Error("Chunk text is required");
  }

  if (!model || typeof model !== "string") {
    throw new Error("Embedding model is required");
  }

  const vector = await embedder.embed(chunk.text, {
  inputType: "document",
  });

  return {
    chunkId: chunk.chunkId,
    sourceId: chunk.sourceId,
    text: chunk.text,
    metadata: chunk.metadata || {},
    embedding: vector,
    model,
    dimensions: vector.length,
  };
}

/**
 * Embeds multiple chunks.
 *
 * @param {Object[]} chunks
 * @param {Object} provider
 * @param {string} model
 * @returns {Promise<Object[]>}
 */
async function embedChunks(chunks, provider, model) {
  if (!Array.isArray(chunks)) {
    throw new Error("chunks must be an array");
  }

  const embedder = createEmbedder(provider);

  const embeddedChunks = [];

  for (const chunk of chunks) {
    const embeddedChunk = await embedChunk(
      chunk,
      embedder,
      model
    );

    embeddedChunks.push(embeddedChunk);
  }

  return embeddedChunks;
}

module.exports = {
  embedChunk,
  embedChunks,
};