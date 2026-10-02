const { parseQuranpediaDump, extractHafsAyahs } = require('./quranParser');
const { buildQuranChunk } = require('./quranChunkBuilder');

const COLLECTION_NAME = 'knowledge_chunks';
const DEFAULT_BATCH_SIZE = 32;

async function ingestQuran({ db, embeddingProvider, dumpPath, batchSize = DEFAULT_BATCH_SIZE, dryRun = false }) {
  if (!db || typeof db.collection !== 'function') throw new Error('MongoDB database instance is required');
  if (!embeddingProvider || typeof embeddingProvider.embed !== 'function') {
    throw new Error('Embedding provider is required');
  }
  if (!dumpPath) throw new Error('dumpPath is required');

  const dump = parseQuranpediaDump(dumpPath);
  const ayahs = extractHafsAyahs(dump);
  const sourceVersion = dump.license.version;
  const collection = db.collection(COLLECTION_NAME);

  let written = 0;
  for (let start = 0; start < ayahs.length; start += batchSize) {
    const batch = ayahs.slice(start, start + batchSize);
    const chunks = batch.map((ayah) => buildQuranChunk(ayah, sourceVersion));

    let embeddings;
    if (typeof embeddingProvider.embedBatch === 'function') {
      embeddings = await embeddingProvider.embedBatch(chunks.map((c) => c.text), { inputType: 'document' });
    } else {
      embeddings = [];
      for (const chunk of chunks) {
        embeddings.push(await embeddingProvider.embed(chunk.text, { inputType: 'document' }));
      }
    }

    if (!Array.isArray(embeddings) || embeddings.length !== chunks.length) {
      throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings?.length ?? 0}`);
    }

    if (dryRun) {
      written += chunks.length;
      continue;
    }

    const now = new Date();
    const operations = chunks.map((chunk, index) => ({
      updateOne: {
        filter: { chunkId: chunk.chunkId },
        update: {
          $set: {
            chunkId: chunk.chunkId,
            sourceId: chunk.sourceId,
            text: chunk.text,
            metadata: chunk.metadata,
            embedding: embeddings[index],
            model: process.env.VOYAGE_EMBEDDING_MODEL || 'voyage-4-large',
            dimensions: embeddings[index].length,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    }));

    await collection.bulkWrite(operations, { ordered: true });
    written += chunks.length;

    console.log(`Quran ingestion: ${written}/${ayahs.length}`);
  }

  return {
    sourceId: 'quran-quranpedia-hafs',
    sourceVersion,
    surahs: 114,
    ayahs: ayahs.length,
    written,
    dryRun,
  };
}

module.exports = { ingestQuran, COLLECTION_NAME };
