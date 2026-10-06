const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { ingestTafsir } = require("./tafsirIngestion");

test("tafsir ingestion embeds deduplicated blocks in batches and upserts validated vectors", async () => {
  const filePath = path.resolve(__dirname, "../../../../../../data/tafsir/tafsir-book-1.json.gz");
  const stored = new Map();
  const batchLengths = [];
  const collection = {
    async bulkWrite(operations) {
      for (const operation of operations) {
        const document = operation.updateOne.update.$set;
        stored.set(document.chunkId, document);
      }
    },
    async countDocuments(filter) {
      const matches = [...stored.values()].filter((document) => document.sourceId === filter.sourceId);
      if (filter.dimensions && filter.dimensions.$ne !== undefined) return matches.filter((document) => document.dimensions !== filter.dimensions.$ne).length;
      return matches.length;
    },
  };
  const result = await ingestTafsir({
    filePath,
    db: { collection: () => collection },
    batchSize: 32,
    embeddingProvider: {
      async embedBatch(texts, options) {
        assert.equal(options.inputType, "document");
        batchLengths.push(texts.length);
        return texts.map(() => Array(1024).fill(0.125));
      },
    },
  });

  assert.equal(result.ayahRows, 6236);
  assert.equal(result.planned, 1460);
  assert.equal(result.written, 1460);
  assert.equal(result.storedCount, 1460);
  assert.equal(result.invalidDimensions, 0);
  assert.equal(stored.size, 1460);
  assert.equal(batchLengths.length, 46);
  assert.equal(batchLengths.at(-1), 20);
  const first = [...stored.values()][0];
  assert.equal(first.metadata.category, "tafsir");
  assert.match(first.metadata.reference, /^Quran /);
  assert.equal(first.dimensions, 1024);
});
