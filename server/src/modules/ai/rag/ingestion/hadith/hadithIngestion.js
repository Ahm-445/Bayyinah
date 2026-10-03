const { parseHadithFiles } = require("./hadithParser");
const { createHadithSource, buildHadithChunk } = require("./hadithChunkBuilder");

const COLLECTION_NAME = "knowledge_chunks";
const DEFAULT_BATCH_SIZE = 8;
const EMBEDDING_DIMENSIONS = 1024;
const DEFAULT_RETRY_DELAYS_MS = Object.freeze([1000, 2000, 4000, 8000, 16000]);

function prepareHadithIngestion({ bukhariFile, muslimFile, sourceMetadata, expectedHadithCounts }) {
  if (!sourceMetadata || typeof sourceMetadata !== "object") throw new Error("Source approval metadata is required to build ingestion chunks");
  const parsed = parseHadithFiles({ bukhariFile, muslimFile, expectedHadithCounts });
  const preparedBooks = parsed.books.map((book) => {
    const source = createHadithSource({ bookKey: book.book.slug, ...sourceMetadata });
    return { book, source, chunks: book.hadiths.map((hadith) => buildHadithChunk(hadith, source)) };
  });
  return { ...parsed, preparedBooks };
}

function getStatusCode(error) {
  for (let current = error; current; current = current.cause) {
    const status = Number(current.status ?? current.statusCode ?? current.response?.status);
    if (Number.isInteger(status)) return status;
    const match = /Voyage API error\s*\((\d{3})\)/i.exec(current.message || "");
    if (match) return Number(match[1]);
  }
  return null;
}

function isTransientEmbeddingError(error) {
  const status = getStatusCode(error);
  if (status !== null) return status === 429 || (status >= 500 && status <= 599);
  for (let current = error; current; current = current.cause) {
    const code = String(current.code || "").toUpperCase();
    if (["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED", "EPIPE", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET", "ABORT_ERR"].includes(code)) return true;
    if (/fetch failed/i.test(current.message || "")) return true;
  }
  return false;
}

async function embedBatchWithRetry(embeddingProvider, texts, {
  inputType = "document",
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await embeddingProvider.embedBatch(texts, { inputType });
    } catch (error) {
      const attempts = attempt + 1;
      if (!isTransientEmbeddingError(error) || attempt >= retryDelaysMs.length) {
        if (error && typeof error === "object") error.embeddingAttempts = attempts;
        throw error;
      }
      await sleep(retryDelaysMs[attempt]);
    }
  }
}

async function readExistingChunkIds(collection, sourceId, chunkIds) {
  const filter = { sourceId };
  if (chunkIds) filter.chunkId = { $in: chunkIds };
  const documents = await collection.find(filter, { projection: { _id: 0, chunkId: 1 } }).toArray();
  return new Set(documents.map((document) => document.chunkId).filter(Boolean));
}

async function getInitialStorageState(collection, sourceId, chunkIds) {
  const [storedCount, existingIds] = await Promise.all([
    collection.countDocuments({ sourceId }),
    readExistingChunkIds(collection, sourceId, chunkIds),
  ]);
  return { storedCount, existingIds };
}

function summarizeDryRunBook(book, storedCount, missingCount) {
  return {
    key: book.book.slug,
    title: book.book.title,
    hadiths: book.hadiths.length,
    chapters: book.chapters.length,
    missingEnglishText: book.missingEnglishText,
    alreadyStored: storedCount,
    wouldEmbed: missingCount,
  };
}

async function ingestHadith({
  bukhariFile,
  muslimFile,
  sourceMetadata,
  expectedHadithCounts,
  db,
  embeddingProvider,
  batchSize = DEFAULT_BATCH_SIZE,
  dryRun = false,
  sleep,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
}) {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error("batchSize must be a positive integer");
  const parsed = parseHadithFiles({ bukhariFile, muslimFile, expectedHadithCounts });
  if (!db || typeof db.collection !== "function") {
    if (dryRun) {
      return {
        books: parsed.books.map((book) => summarizeDryRunBook(book, null, book.hadiths.length)),
        hadithCount: parsed.hadithCount,
        planned: parsed.hadithCount,
        written: 0,
        dryRun: true,
        mongoChecked: false,
      };
    }
    throw new Error("MongoDB database instance is required");
  }

  const collection = db.collection(COLLECTION_NAME);
  if (dryRun) {
    const books = [];
    for (const book of parsed.books) {
      const sourceId = `ahmedbaset-hadith-${book.book.slug}`;
      const chunkIds = book.hadiths.map((hadith) => `${sourceId}-${hadith.idInBook}`);
      const { existingIds } = await getInitialStorageState(collection, sourceId, chunkIds);
      books.push(summarizeDryRunBook(book, existingIds.size, chunkIds.length - existingIds.size));
    }
    return {
      books,
      hadithCount: parsed.hadithCount,
      planned: parsed.hadithCount,
      wouldEmbed: books.reduce((sum, book) => sum + book.wouldEmbed, 0),
      written: 0,
      dryRun: true,
      mongoChecked: true,
    };
  }

  const { preparedBooks, hadithCount } = prepareHadithIngestion({
    bukhariFile, muslimFile, sourceMetadata, expectedHadithCounts,
  });
  if (!embeddingProvider || typeof embeddingProvider.embedBatch !== "function") throw new Error("Batch embedding provider is required");

  const totals = [];
  for (const { book, source, chunks } of preparedBooks) {
    const { storedCount: initialStoredCount, existingIds } = await getInitialStorageState(collection, source.sourceId, chunks.map((chunk) => chunk.chunkId));
    let storedProgress = initialStoredCount;
    let skippedThisRun = existingIds.size;
    let writtenThisRun = 0;
    console.log(`${book.book.title}: ${initialStoredCount}/${chunks.length} already stored`);

    const initiallyMissing = chunks.filter((chunk) => !existingIds.has(chunk.chunkId));
    for (let start = 0; start < initiallyMissing.length; start += batchSize) {
      const candidateBatch = initiallyMissing.slice(start, start + batchSize);

      // Recheck each candidate batch immediately before embedding so concurrent runs do not
      // redundantly embed chunks another process has just stored.
      const nowExisting = await readExistingChunkIds(collection, source.sourceId, candidateBatch.map((chunk) => chunk.chunkId));
      const batch = candidateBatch.filter((chunk) => !nowExisting.has(chunk.chunkId));
      skippedThisRun += candidateBatch.length - batch.length;
      storedProgress += candidateBatch.length - batch.length;
      if (!batch.length) continue;

      const firstHadith = batch[0].metadata.hadithNumber;
      const lastHadith = batch.at(-1).metadata.hadithNumber;
      console.log(`${book.book.title}: embedding ${batch.length} new hadiths (${firstHadith}-${lastHadith})`);

      let embeddings;
      try {
        embeddings = await embedBatchWithRetry(embeddingProvider, batch.map((chunk) => chunk.text), {
          inputType: "document",
          retryDelaysMs,
          ...(sleep ? { sleep } : {}),
        });
      } catch (error) {
        const remaining = Math.max(0, chunks.length - storedProgress);
        throw new Error(
          `Embedding failed for ${book.book.title}, hadiths ${firstHadith}-${lastHadith}, after ${error.embeddingAttempts || 1} attempt(s). ` +
          `${storedProgress}/${chunks.length} already stored; ${remaining} remaining. No records from this failed embedding batch were written. Cause: ${error.message || String(error)}`,
          { cause: error },
        );
      }

      if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
        throw new Error(`Invalid embedding response for ${book.book.title} hadiths ${firstHadith}-${lastHadith}: expected ${batch.length} embeddings, got ${embeddings?.length ?? 0}. No records from this batch were written.`);
      }
      const now = new Date();
      const operations = batch.map((chunk, index) => {
        const embedding = embeddings[index];
        if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS || embedding.some((value) => !Number.isFinite(value))) {
          throw new Error(`Invalid embedding dimensions or values for ${chunk.chunkId}; no records from hadith batch ${firstHadith}-${lastHadith} were written`);
        }
        return { updateOne: {
          filter: { chunkId: chunk.chunkId },
          update: {
            $set: { chunkId: chunk.chunkId, sourceId: chunk.sourceId, text: chunk.text, metadata: chunk.metadata, embedding, model: process.env.VOYAGE_EMBEDDING_MODEL || "voyage-4-large", dimensions: embedding.length, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        } };
      });
      await collection.bulkWrite(operations, { ordered: true });
      writtenThisRun += batch.length;
      storedProgress += batch.length;
      console.log(`${book.book.title}: stored ${storedProgress}/${chunks.length}`);
    }

    const storedCount = await collection.countDocuments({ sourceId: source.sourceId });
    if (storedCount !== chunks.length) throw new Error(`Expected ${chunks.length} ${book.book.title} chunks in MongoDB after resume, found ${storedCount}`);
    const invalidDimensions = await collection.countDocuments({ sourceId: source.sourceId, dimensions: { $ne: EMBEDDING_DIMENSIONS } });
    if (invalidDimensions) throw new Error(`Found ${invalidDimensions} ${book.book.title} chunks with invalid embedding dimensions`);
    totals.push({
      key: book.book.slug,
      sourceId: source.sourceId,
      planned: chunks.length,
      initiallyStored: initialStoredCount,
      skippedThisRun,
      written: writtenThisRun,
      storedCount,
      invalidDimensions,
    });
  }
  return { books: totals, hadithCount, planned: totals.reduce((sum, item) => sum + item.planned, 0), written: totals.reduce((sum, item) => sum + item.written, 0), dryRun: false };
}

module.exports = {
  COLLECTION_NAME,
  DEFAULT_BATCH_SIZE,
  DEFAULT_RETRY_DELAYS_MS,
  EMBEDDING_DIMENSIONS,
  embedBatchWithRetry,
  getStatusCode,
  isTransientEmbeddingError,
  prepareHadithIngestion,
  ingestHadith,
};
