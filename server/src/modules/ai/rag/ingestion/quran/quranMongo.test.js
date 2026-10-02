require("dotenv").config();

const assert = require("assert");

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

async function main() {
  console.log("Connecting to MongoDB...");

  const db = await connectMongo();
  const chunkStore = createChunkStore(db);
  const dump = parseQuranpediaDump(DUMP_PATH);
  const ayahs = extractHafsAyahs(dump);

  const selected = ayahs.filter(
    (ayah) =>
      (ayah.surahNumber === 1 && ayah.ayahNumber === 1) ||
      (ayah.surahNumber === 2 && ayah.ayahNumber === 255) ||
      (ayah.surahNumber === 112 && ayah.ayahNumber === 1)
  );

  assert.strictEqual(selected.length, 3);

  const chunks = selected.map(buildQuranChunk);

  const embeddingProvider =
    createVoyageEmbeddingProvider();

  for (const chunk of chunks) {
    console.log(
      `Embedding ${chunk.metadata.reference}...`
    );

    const embedding =
      await embeddingProvider.embed(
        chunk.text,
        { inputType: "document" }
      );

    assert.strictEqual(embedding.length, 1024);

    await chunkStore.insertChunk({
      ...chunk,
      embedding,
      model: "voyage-4-large",
      dimensions: 1024,
    });

    console.log(
      `Inserted: ${chunk.chunkId} ✅`
    );
  }

  const collection = db.collection("knowledge_chunks");

  const count = await collection.countDocuments({
    sourceId: "quranpedia-quran-hafs",
  });

  console.log(
    `Quran chunks in MongoDB: ${count}`
  );

  assert.ok(count >= 3);

  console.log(
    "Quran MongoDB ingestion test: PASSED"
  );

  await closeMongo();
}

main().catch(async (error) => {
  console.error(
    "Quran MongoDB ingestion test: FAILED"
  );

  console.error(error);

  try {
    await closeMongo();
  } catch {}

  process.exit(1);
});