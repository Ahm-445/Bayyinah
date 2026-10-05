const assert = require("assert");
const path = require("path");

const {
  createVoyageEmbeddingProvider,
} = require("./voyageEmbeddingProvider");

function mockFetch(jsonPayload, ok) {
  global.fetch = async () => ({
    ok,
    async json() { return jsonPayload; },
    async text() { return "error-body"; },
  });
}

async function testEmbed() {
  const vec = [0.1, 3955, 4];
  mockFetch({ data: [{ embedding: vec }] }, true);
  const provider = createVoyageEmbeddingProvider({
    apiKey: "test",
    dimensions: vec.length,
  });
  const embedding = await provider.embed("hello", { inputType: "query" });
  assert.deepStrictEqual(embedding, vec);
}

async function testEmbedBatch() {
  const first = [28, 167, 5];
  const second = [328, 950, 397];
  mockFetch({
    data: [
      { embedding: first },
      { embedding: second },
    ],
  }, true);
  const provider = createVoyageEmbeddingProvider({
    apiKey: "test",
    dimensions: first.length,
  });
  const embeddings = await provider.embedBatch(["a", "b"], { inputType: "document" });
  assert.deepStrictEqual(embeddings, [first, second]);
}

async function testDimensionValidation() {
  const short = [99, 53];
  mockFetch({ data: [{ embedding: short }] }, true);
  const provider = createVoyageEmbeddingProvider({
    apiKey: "test",
    dimensions: short.length + 1,
  });
  await assert.rejects(
    () => provider.embed("x", { inputType: "query" }),
    /Invalid embedding dimensions/
  );
}

async function testInputValidation() {
  const provider = createVoyageEmbeddingProvider({ apiKey: "test" });
  await assert.rejects(() => provider.embed("", { inputType: "query" }), /Text is required/);
  await assert.rejects(() => provider.embed("x", { inputType: "bad" }), /inputType must be query or document/);
  await assert.rejects(() => provider.embedBatch([], { inputType: "document" }), /Texts are required/);
  await assert.rejects(() => provider.embedBatch(["x"], { inputType: "bad" }), /inputType must be query or document/);
}

async function testUnifiedSource() {
  const provider = createVoyageEmbeddingProvider({ apiKey: "test" });
  assert.strictEqual(typeof provider.embed, "function");
  assert.strictEqual(typeof provider.embedBatch, "function");

  const canonical = require.resolve("./voyageEmbeddingProvider");
  const aiDir = path.join(__dirname, "..");
  const fromRuntime = path.resolve(aiDir, "./providers/voyageEmbeddingProvider.js");
  const ingestionDir = path.join(__dirname, "../rag/ingestion/quran");
  const fromIngestion = path.resolve(ingestionDir, "../../../providers/voyageEmbeddingProvider.js");

  assert.strictEqual(fromRuntime, canonical);
  assert.strictEqual(fromIngestion, canonical);
}

async function main() {
  await testEmbed();
  await testEmbedBatch();
  await testDimensionValidation();
  await testInputValidation();
  await testUnifiedSource();
  console.log("voyageEmbeddingProvider unit test: PASSED");
}

main().catch((error) => {
  console.error("voyageEmbeddingProvider unit test: FAILED");
  console.error(error);
  process.exit(1);
});
