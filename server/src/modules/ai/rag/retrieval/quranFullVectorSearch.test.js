require("dotenv").config();

const assert = require("assert");

const {
  connectMongo,
  closeMongo,
} = require("../storage/mongoClient");

const {
  createVoyageEmbeddingProvider,
} = require("../../providers/voyageEmbeddingProvider");

const {
  createRetriever,
} = require("./retriever");

async function main() {
  console.log("Connecting to MongoDB...");

  const db = await connectMongo();

  const collection = db.collection("knowledge_chunks");

  const quranCount = await collection.countDocuments({
    sourceId: "quranpedia-quran-hafs",
  });

  console.log(
    `Quran chunks available: ${quranCount}`
  );

  assert.strictEqual(
    quranCount,
    6236,
    "Expected all 6236 Quran chunks"
  );

  const embeddingProvider =
    createVoyageEmbeddingProvider();

  const retriever = createRetriever({
    db,
    embeddingProvider,
    topK: 5,
  });

  const tests = [
    {
      question: "آية الكرسي",
      expectedChunkId: "quran-hafs-2-255",
    },
    {
      question: "قل هو الله أحد",
      expectedChunkId: "quran-hafs-112-1",
    },
    {
      question: "الحمد لله رب العالمين",
      expectedChunkId: "quran-hafs-1-2",
    },
    {
      question: "من شر الوسواس الخناس",
      expectedChunkId: "quran-hafs-114-4",
    },
  ];

  for (const test of tests) {
    console.log(
      `\nQuestion: ${test.question}`
    );

    const results =
      await retriever.retrieve(test.question);

    console.table(
      results.map((result) => ({
        chunkId: result.chunkId,
        reference: result.citation.reference,
        score: Number(result.score.toFixed(4)),
      }))
    );

    assert.ok(
      results.length > 0,
      "Retriever returned no results"
    );

    const expected = results.find(
      (result) =>
        result.chunkId === test.expectedChunkId
    );

    assert.ok(
      expected,
      `Expected ${test.expectedChunkId} was not retrieved`
    );

    console.log(
      `Expected verse retrieved: ${expected.chunkId} ✅`
    );
  }

  console.log(
    "\nQuran full vector search test: PASSED ✅"
  );

  await closeMongo();
}

main().catch(async (error) => {
  console.error(
    "\nQuran full vector search test: FAILED ❌"
  );

  console.error(error);

  try {
    await closeMongo();
  } catch {}

  process.exit(1);
});