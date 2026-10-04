const { parseTafsirFile } = require("./tafsirParser");
const { createTafsirSource, buildTafsirChunk, SOURCE_ID } = require("./tafsirChunkBuilder");

const COLLECTION_NAME = "knowledge_chunks";
const DEFAULT_BATCH_SIZE = 8;
const EMBEDDING_DIMENSIONS = 1024;

function prepareTafsirIngestion({ filePath }) {
  const parsed = parseTafsirFile(filePath);
  const source = createTafsirSource({ version: parsed.license.version, usageBasis: parsed.license.en });
  const chunks = parsed.blocks.map((block) => buildTafsirChunk(block, source));
  return { parsed, source, chunks };
}

async function ingestTafsir({ filePath, db, embeddingProvider, batchSize = DEFAULT_BATCH_SIZE, dryRun = false }) {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error("batchSize must be a positive integer");
  const { parsed, source, chunks } = prepareTafsirIngestion({ filePath });
  if (dryRun) {
    return { sourceId: source.sourceId, sourceVersion: source.version, book: parsed.book.name, author: parsed.book.author.full_name, ayahRows: parsed.ayahRows, planned: chunks.length, written: 0, dryRun: true };
  }
  if (!db || typeof db.collection !== "function") throw new Error("MongoDB database instance is required");
  if (!embeddingProvider || typeof embeddingProvider.embedBatch !== "function") throw new Error("Batch embedding provider is required");

  const collection = db.collection(COLLECTION_NAME);
  let written = 0;
  for (let start = 0; start < chunks.length; start += batchSize) {
    const batch = chunks.slice(start, start + batchSize);
    const embeddings = await embeddingProvider.embedBatch(batch.map((chunk) => chunk.text), { inputType: "document" });
    if (!Array.isArray(embeddings) || embeddings.length !== batch.length) throw new Error(`Embedding count mismatch: expected ${batch.length}, got ${embeddings?.length ?? 0}`);
    const now = new Date();
    const operations = batch.map((chunk, index) => {
      const embedding = embeddings[index];
      if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS || embedding.some((value) => !Number.isFinite(value))) {
        throw new Error(`Invalid embedding dimensions or values for ${chunk.chunkId}`);
      }
      return { updateOne: {
        filter: { chunkId: chunk.chunkId },
        update: { $set: { chunkId: chunk.chunkId, sourceId: chunk.sourceId, text: chunk.text, metadata: chunk.metadata, embedding, model: process.env.VOYAGE_EMBEDDING_MODEL || "voyage-4-large", dimensions: embedding.length, updatedAt: now }, $setOnInsert: { createdAt: now } },
        upsert: true,
      } };
    });
    await collection.bulkWrite(operations, { ordered: true });
    written += batch.length;
    console.log(`Tafsir ingestion: ${written}/${chunks.length}`);
  }
  const storedCount = await collection.countDocuments({ sourceId: SOURCE_ID });
  if (storedCount !== chunks.length) throw new Error(`Expected ${chunks.length} tafsir chunks in MongoDB, found ${storedCount}`);
  const invalidDimensions = await collection.countDocuments({ sourceId: SOURCE_ID, dimensions: { $ne: EMBEDDING_DIMENSIONS } });
  if (invalidDimensions) throw new Error(`Found ${invalidDimensions} tafsir chunks with invalid embedding dimensions`);
  return { sourceId: source.sourceId, sourceVersion: source.version, book: parsed.book.name, author: parsed.book.author.full_name, ayahRows: parsed.ayahRows, planned: chunks.length, written, storedCount, invalidDimensions, dryRun: false };
}

module.exports = { COLLECTION_NAME, DEFAULT_BATCH_SIZE, EMBEDDING_DIMENSIONS, prepareTafsirIngestion, ingestTafsir };
