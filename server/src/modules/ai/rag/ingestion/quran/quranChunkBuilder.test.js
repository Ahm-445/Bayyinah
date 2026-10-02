const assert = require("assert");
const {
  buildQuranChunk,
  buildQuranChunks,
} = require("./quranChunkBuilder");

const ayah = {
  id: 1,
  surahNumber: 1,
  surahName: "سورة الفاتحة",
  ayahNumber: 1,
  pageNumber: 1,
  text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  juz: 1,
  hizb: 1,
  ruku: 1,
  manzil: 1,
};

const chunk = buildQuranChunk(ayah);

assert.strictEqual(
  chunk.chunkId,
  "quran-hafs-1-1"
);

assert.strictEqual(
  chunk.sourceId,
  "quranpedia-quran-hafs"
);

assert.strictEqual(
  chunk.text,
  ayah.text
);

assert.strictEqual(
  chunk.metadata.category,
  "quran"
);

assert.strictEqual(
  chunk.metadata.sourceType,
  "quran"
);

assert.strictEqual(
  chunk.metadata.surahNumber,
  1
);

assert.strictEqual(
  chunk.metadata.ayahNumber,
  1
);

assert.strictEqual(
  chunk.metadata.reference,
  "سورة الفاتحة، الآية 1"
);

assert.strictEqual(
  chunk.metadata.approved,
  true
);

const chunks = buildQuranChunks([ayah]);

assert.strictEqual(chunks.length, 1);
assert.deepStrictEqual(chunks[0], chunk);

console.log("Quran chunk builder test: PASSED");
console.log(chunk);