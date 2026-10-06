const assert = require("node:assert/strict");
const test = require("node:test");
const { createSourceRegistry } = require("./sourceRegistry");
const { createVectorRetriever } = require("./vectorRetriever");

function registryDb(rows, calls = { reads: 0 }) {
  return {
    collection(name) {
      assert.equal(name, "app_sources");
      return {
        find(filter) {
          assert.deepEqual(filter, { active: false });
          calls.reads += 1;
          return { toArray: async () => rows };
        },
      };
    },
  };
}

test("the source registry lists switched-off sources and caches them", async () => {
  let clock = 0;
  const calls = { reads: 0 };
  const registry = createSourceRegistry(registryDb([{ sourceId: "quranpedia-tafsir-book-1" }], calls), { now: () => clock });
  assert.deepEqual(await registry.inactiveSourceIds(), ["quranpedia-tafsir-book-1"]);
  await registry.inactiveSourceIds();
  assert.equal(calls.reads, 1, "cached");
  clock = 61 * 1000;
  await registry.inactiveSourceIds();
  assert.equal(calls.reads, 2, "re-read after a minute");
});

test("an unreadable registry does not stop retrieval", async () => {
  const registry = createSourceRegistry({ collection: () => ({ find() { throw new Error("down"); } }) }, { logger: { warn() {} } });
  assert.deepEqual(await registry.inactiveSourceIds(), []);
});

test("the retriever drops chunks of switched-off sources and still returns topK", async () => {
  const pipelines = [];
  const chunk = (sourceId, n) => ({ sourceId, chunkId: `${sourceId}-${n}`, text: "t", score: 0.9, metadata: { approved: true, category: "tafsir", sourceType: "tafsir", language: "ar" } });
  const db = {
    collection: () => ({
      aggregate(pipeline) {
        pipelines.push(pipeline);
        return { toArray: async () => [chunk("quranpedia-tafsir-book-4", 1), chunk("quranpedia-tafsir-book-4", 2)] };
      },
    }),
  };
  const embeddingProvider = { embed: async () => Array(1024).fill(0.1) };

  const withRegistry = createVectorRetriever({
    db, embeddingProvider, topK: 3,
    sourceRegistry: { inactiveSourceIds: async () => ["quranpedia-tafsir-book-1"] },
  });
  await withRegistry.retrieve("ما معنى التوحيد؟", { category: "tafsir" });
  const [search, match, limit] = pipelines[0];
  assert.equal(search.$vectorSearch.limit, 12, "asks for more candidates");
  assert.deepEqual(match, { $match: { sourceId: { $nin: ["quranpedia-tafsir-book-1"] } } });
  assert.deepEqual(limit, { $limit: 3 });

  const withoutRegistry = createVectorRetriever({ db, embeddingProvider, topK: 3 });
  await withoutRegistry.retrieve("ما معنى التوحيد؟", { category: "tafsir" });
  assert.equal(pipelines[1][0].$vectorSearch.limit, 3);
  assert.ok(pipelines[1].every((stage) => !stage.$match), "no filter when nothing is switched off");
});
