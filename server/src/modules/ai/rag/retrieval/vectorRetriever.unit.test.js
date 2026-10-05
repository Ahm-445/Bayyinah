const assert = require("assert");

const {
  createVectorRetriever,
} = require("./vectorRetriever");

async function main() {
  const results = [
    {
      chunkId: "quran-hafs-1-1",
      sourceId: "quranpedia-quran-hafs",
      text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      metadata: {
        title: "القرآن الكريم - حفص عن عاصم",
        reference: "الفاتحة، الآية 1",
      },
      model: "voyage-4-large",
      dimensions: 1024,
      score: 0.95,
    },
  ];

  const db = {
    collection: () => ({
      aggregate: () => ({
        toArray: async () => results,
      }),
    }),
  };

  const embeddingProvider = {
    embed: async () => [0.1, 0.2, 0.3],
  };

  const retriever = createVectorRetriever({
    db,
    embeddingProvider,
    topK: 3,
  });

  const evidence = await retriever.retrieve("ما هو التوحيد؟");

  assert.strictEqual(evidence.length, 1);
  assert.strictEqual(evidence[0].citation.sourceId, "quranpedia-quran-hafs");
  assert.strictEqual(evidence[0].citation.chunkId, "quran-hafs-1-1");
  assert.strictEqual(
    evidence[0].citation.sourceTitle,
    "القرآن الكريم - حفص عن عاصم"
  );
  assert.strictEqual(evidence[0].citation.reference, "الفاتحة، الآية 1");

  console.log("vectorRetriever unit test: PASSED");
}

main().catch((error) => {
  console.error("vectorRetriever unit test: FAILED");
  console.error(error);
  process.exit(1);
});
