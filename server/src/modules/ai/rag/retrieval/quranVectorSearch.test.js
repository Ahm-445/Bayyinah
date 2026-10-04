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

  const embeddingProvider =
    createVoyageEmbeddingProvider();

  const retriever = createRetriever({
    db,
    embeddingProvider,
    topK: 3,
  });

  const tests = [
    {
      question: "آية الكرسي",
      expectedChunkId: "quran-hafs-2-255",
    },
    {
      question: "بسم الله الرحمن الرحيم",
      expectedChunkId: "quran-hafs-1-1",
    },
    {
      question: "قل هو الله أحد",
      expectedChunkId: "quran-hafs-112-1",
    },
  ];

  for (const test of tests) {
    console.log(`\nQuestion: ${test.question}`);

    const results =
      await retriever.retrieve(test.question);

    console.log(
      results.map((result) => ({
        chunkId: result.chunkId,
        reference: result.citation.reference,
        score: result.score,
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

    assert.ok(
      expected.score >= 0.7,
      `Expected score >= 0.7, got ${expected.score}`
    );

    console.log(
      `Expected verse retrieved: ${expected.chunkId} ✅`
    );
  }

  console.log(
    "\nQuran vector search test: PASSED"
  );

  await closeMongo();
}

main().catch(async (error) => {
  console.error(
    "\nQuran vector search test: FAILED"
  );

  console.error(error);

  try {
    await closeMongo();
  } catch {}

  process.exit(1);
});