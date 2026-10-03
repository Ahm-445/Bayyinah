const assert = require("node:assert/strict");
const test = require("node:test");
const { createVectorRetriever } = require("./vectorRetriever");

test("required source retrieval searches each source type and merges evidence", async () => {
  const capturedFilters = [];
  let embedCalls = 0;
  const db = {
    collection(name) {
      assert.equal(name, "knowledge_chunks");
      return {
        aggregate(pipeline) {
          const filter = pipeline[0].$vectorSearch.filter;
          capturedFilters.push(filter);
          const category = filter["metadata.category"].$in[0];
          return {
            async toArray() {
              const quran = category === "quran";
              return [{
                sourceId: quran ? "quran-source" : "hadith-source",
                chunkId: quran ? "quran-1-1" : "hadith-1",
                text: "stored source text",
                metadata: {
                  approved: true,
                  category,
                  sourceType: category,
                  language: "ar",
                },
                score: quran ? 0.8 : 0.9,
              }];
            },
          };
        },
      };
    },
  };
  const retriever = createVectorRetriever({
    db,
    embeddingProvider: {
      async embed(_text, options) {
        embedCalls += 1;
        assert.equal(options.inputType, "query");
        return Array(1024).fill(0.1);
      },
    },
  });

  const evidence = await retriever.retrieve("Tawhid in Quran and hadith", {
    category: "aqeedah",
    sourceLanguages: ["ar", "en"],
    requiredSourceTypes: ["quran", "hadith"],
  });

  assert.equal(embedCalls, 1);
  assert.deepEqual(capturedFilters.map((filter) => filter["metadata.category"].$in), [["quran", "translation"], ["hadith"]]);
  assert.deepEqual(evidence.map((item) => item.sourceId), ["hadith-source", "quran-source"]);
});
