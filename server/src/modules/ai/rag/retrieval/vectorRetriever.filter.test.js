const assert = require("assert");
const { createVectorRetriever } = require("./vectorRetriever");

async function main() {
  let capturedPipeline;

  const db = {
    collection(name) {
      assert.strictEqual(name, "knowledge_chunks");
      return {
        aggregate(pipeline) {
          capturedPipeline = pipeline;
          return {
            async toArray() {
              return [
                {
                  sourceId: "approved-source",
                  chunkId: "approved-chunk-1",
                  text: "Approved test evidence.",
                  metadata: {
                    approved: true,
                    category: "quran",
                    language: "ar",
                    title: "Quran source",
                    reference: "Test ref",
                  },
                  score: 0.91,
                },
              ];
            },
          };
        },
      };
    },
  };

  const retriever = createVectorRetriever({
    db,
    embeddingProvider: {
      async embed(_question, options) {
        assert.strictEqual(options.inputType, "query");
        return Array(1024).fill(0.1);
      },
    },
  });

  const evidence = await retriever.retrieve("test question", {
    category: "aqeedah",
    sourceLanguages: ["AR", "en"],
  });
  assert.deepStrictEqual(capturedPipeline[0].$vectorSearch.filter, {
    "metadata.approved": { $eq: true },
    "metadata.category": {
      $in: ["aqeedah", "quran", "hadith", "tafsir"],
    },
    "metadata.language": { $in: ["ar", "en"] },
  });
  assert.strictEqual(evidence.length, 1);
  assert.strictEqual(evidence[0].citation.reference, "Test ref");
  assert.strictEqual(evidence[0].citation.title, "Quran source");

  console.log("Approved-only vector retrieval test: PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
