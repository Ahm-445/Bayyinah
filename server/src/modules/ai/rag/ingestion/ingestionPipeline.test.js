const assert = require("assert");
const { ingestSource } = require("./ingestionPipeline");

const result = ingestSource({
  source: {
    sourceId: "tafseer-example",
    title: "Approved Tafsir",
    type: "tafsir",
    language: "ar",
    reference: "Volume and page",
    url: "https://example.org/tafsir",
    version: "edition-1",
    usageBasis: "Licensed for this application",
    metadata: { author: "Approved author", collection: "Approved collection" },
    approved: true,
  },
  text: "A sourced explanation of a verse.",
  metadataForChunk: (_chunkText, index) => ({
    volume: 2,
    pageNumber: index + 20,
    reference: `Book 1, page ${index + 20}`,
    hadithNumber: "123",
    grade: "sahih",
  }),
});

assert.strictEqual(result.chunks.length, 1);
assert.strictEqual(result.chunks[0].metadata.category, "tafsir");
assert.strictEqual(result.chunks[0].metadata.sourceType, "tafsir");
assert.strictEqual(result.chunks[0].metadata.approved, true);
assert.strictEqual(result.chunks[0].metadata.url, "https://example.org/tafsir");
assert.strictEqual(result.chunks[0].metadata.version, "edition-1");
assert.strictEqual(result.chunks[0].metadata.reference, "Book 1, page 20");
assert.strictEqual(
  result.chunks[0].metadata.usageBasis,
  "Licensed for this application"
);
assert.strictEqual(result.chunks[0].metadata.author, "Approved author");
assert.strictEqual(result.chunks[0].metadata.volume, 2);
assert.strictEqual(result.chunks[0].metadata.hadithNumber, "123");
assert.strictEqual(result.chunks[0].metadata.grade, "sahih");

console.log("Ingestion provenance metadata tests: PASSED");
