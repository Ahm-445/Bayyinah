const { parseTranslationFile } = require("./saheehInternationalParser");
const {
  createSaheehInternationalSource,
  buildSaheehInternationalChunk,
} = require("./saheehInternationalChunkBuilder");

const COLLECTION_NAME = "knowledge_chunks";
const DEFAULT_BATCH_SIZE = 32;
const EMBEDDING_DIMENSIONS = 1024;

function prepareSaheehInternationalIngestion({ filePath, sourceMetadata }) {
  const parsed = parseTranslationFile(filePath);
  const source = createSaheehInternationalSource({
    ...sourceMetadata,
    sourceDescription: parsed.translation.description,
    sourceName: parsed.translation.name,
  });
  const chunks = parsed.ayahs.map((ayah) => buildSaheehInternationalChunk(ayah, source));
  return { parsed, source, chunks };
}

async function ingestSaheehInternational({
  filePath,
  sourceMetadata,
  db,
  embeddingProvider,
  batchSize = DEFAULT_BATCH_SIZE,
  dryRun = false,
}) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("batchSize must be a positive integer");
  }

  const { parsed, source, chunks } = prepareSaheehInternationalIngestion({
    filePath,
    sourceMetadata,
  });
  if (dryRun) {
    return {
      sourceId: source.sourceId,
      sourceVersion: source.version,
      locale: parsed.translation.localeCode,
      ayahs: parsed.ayahs.length,
      planned: chunks.length,
      written: 0,
      dryRun: true,
    };
  }

  if (!db || typeof db.collection !== "function") {
    throw new Error("MongoDB database instance is required");
  }
  if (!embeddingProvider || typeof embeddingProvider.embedBatch !== "function") {
    throw new Error("Batch embedding provider is required");
  }

  const collection = db.collection(COLLECTION_NAME);
  let written = 0;
  for (let start = 0; start < chunks.length; start += batchSize) {
    const batch = chunks.slice(start, start + batchSize);
    const embeddings = await embeddingProvider.embedBatch(
      batch.map((chunk) => chunk.text),
      { inputType: "document" }
    );
    if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
      throw new Error(`Embedding count mismatch: expected ${batch.length}, got ${embeddings?.length ?? 0}`);
    }

    const now = new Date();
    const operations = batch.map((chunk, index) => {
      const embedding = embeddings[index];
      if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Invalid embedding dimensions for ${chunk.chunkId}`);
      }
      return {
        updateOne: {
          filter: { chunkId: chunk.chunkId },
          update: {
            $set: {
              chunkId: chunk.chunkId,
              sourceId: chunk.sourceId,
              text: chunk.text,
              metadata: chunk.metadata,
              embedding,
              model: process.env.VOYAGE_EMBEDDING_MODEL || "voyage-4-large",
              dimensions: embedding.length,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      };
    });

    await collection.bulkWrite(operations, { ordered: true });
    written += batch.length;
    console.log(`Saheeh International ingestion: ${written}/${chunks.length}`);
  }

  const storedCount = await collection.countDocuments({ sourceId: source.sourceId });
  if (storedCount !== EXPECTED_COUNT) {
    throw new Error(`Expected ${EXPECTED_COUNT} translation chunks in MongoDB, found ${storedCount}`);
  }
  return {
    sourceId: source.sourceId,
    sourceVersion: source.version,
    locale: parsed.translation.localeCode,
    ayahs: parsed.ayahs.length,
    planned: chunks.length,
    written,
    storedCount,
    dryRun: false,
  };
}

const EXPECTED_COUNT = 6236;

module.exports = {
  COLLECTION_NAME,
  DEFAULT_BATCH_SIZE,
  prepareSaheehInternationalIngestion,
  ingestSaheehInternational,
};
