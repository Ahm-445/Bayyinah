require("dotenv").config();

const {
  connectMongo,
  closeMongo,
} = require("../../storage/mongoClient");

const {
  createChunkStore,
} = require("../../storage/chunkStore");

const {
  parseQuranpediaDump,
  extractHafsAyahs,
} = require("./quranParser");

const {
  buildQuranChunk,
} = require("./quranChunkBuilder");

const {
  createVoyageEmbeddingProvider,
} = require("../../embeddings/voyageEmbeddingProvider");

const DUMP_PATH = "data/quran/mushafs-1.json.gz";

const BATCH_SIZE = 50;

async function main() {
  const startedAt = Date.now();

  console.log("=== Quran Full Ingestion ===");
  console.log(`Batch size: ${BATCH_SIZE}`);

  console.log("\nConnecting to MongoDB...");

  const db = await connectMongo();

  const chunkStore = createChunkStore(db);

  console.log("MongoDB connected ✅");

  console.log("\nLoading Quranpedia dump...");

  const dump = parseQuranpediaDump(DUMP_PATH);
  const ayahs = extractHafsAyahs(dump);
  const sourceVersion = dump.license.version;

  console.log(
    `Loaded ${ayahs.length} ayahs ✅`
  );

  if (ayahs.length !== 6236) {
    throw new Error(
      `Expected 6236 ayahs, got ${ayahs.length}`
    );
  }

  const embeddingProvider =
    createVoyageEmbeddingProvider();

  let processed = 0;

  for (
    let start = 0;
    start < ayahs.length;
    start += BATCH_SIZE
  ) {
    const batch = ayahs.slice(
      start,
      start + BATCH_SIZE
    );

    const chunks = batch.map((ayah) => buildQuranChunk(ayah, { sourceVersion }));

    console.log(
      `\nEmbedding ${start + 1}-${start + batch.length} / ${ayahs.length}...`
    );

    const embeddings =
      await embeddingProvider.embedBatch(
        chunks.map((chunk) => chunk.text),
        {
          inputType: "document",
        }
      );

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`
      );
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      if (embedding.length !== 1024) {
        throw new Error(
          `Invalid embedding dimensions for ${chunk.chunkId}: ${embedding.length}`
        );
      }

      await chunkStore.insertChunk({
        ...chunk,
        embedding,
        model: "voyage-4-large",
        dimensions: 1024,
      });

      processed++;
    }

    const percent = (
      (processed / ayahs.length) *
      100
    ).toFixed(1);

    console.log(
      `Inserted ${processed}/${ayahs.length} (${percent}%) ✅`
    );
  }

  const collection =
    db.collection("knowledge_chunks");

  const count =
    await collection.countDocuments({
      sourceId: "quranpedia-quran-hafs",
    });

  console.log("\n=== Validation ===");
  console.log(
    `Quran chunks in MongoDB: ${count}`
  );

  if (count !== 6236) {
    throw new Error(
      `Expected 6236 Quran chunks, got ${count}`
    );
  }

  const invalidDimensions =
    await collection.countDocuments({
      sourceId: "quranpedia-quran-hafs",
      dimensions: { $ne: 1024 },
    });

  if (invalidDimensions !== 0) {
    throw new Error(
      `Found ${invalidDimensions} Quran chunks with invalid dimensions`
    );
  }

  const elapsedSeconds =
    ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(
    `Invalid dimensions: ${invalidDimensions}`
  );

  console.log(
    `\nQuran full ingestion completed in ${elapsedSeconds}s ✅`
  );

  await closeMongo();
}

main().catch(async (error) => {
  console.error(
    "\nQuran full ingestion FAILED ❌"
  );

  console.error(error);

  try {
    await closeMongo();
  } catch {}

  process.exit(1);
});
