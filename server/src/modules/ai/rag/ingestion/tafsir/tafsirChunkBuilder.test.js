const assert = require("assert");

const {
  parseTafsirDump,
  extractTafsirAyahs,
} = require("./tafsirParser");

const {
  buildTafsirChunk,
} = require("./tafsirChunkBuilder");

const DUMP_PATH =
  "data/tafsir/tafsir-book-1.json.gz";

function main() {
  const dump =
    parseTafsirDump(DUMP_PATH);

  const ayahs =
    extractTafsirAyahs(dump);

  const ayah = ayahs.find(
    (item) =>
      item.surahNumber === 1 &&
      item.ayahNumber === 1
  );

  assert.ok(
    ayah,
    "Surah 1:1 tafsir not found"
  );

  const chunk =
    buildTafsirChunk(ayah);

  assert.strictEqual(
    chunk.chunkId,
    "tafsir-book-1-1-1"
  );

  assert.strictEqual(
    chunk.sourceId,
    "quranpedia-tafsir-book-1"
  );

  assert.strictEqual(
    chunk.text,
    ayah.text
  );

  assert.strictEqual(
    chunk.metadata.title,
    "تيسير التفسير"
  );

  assert.strictEqual(
    chunk.metadata.author,
    "إبراهيم القطان"
  );

  assert.strictEqual(
    chunk.metadata.category,
    "tafsir"
  );

  assert.strictEqual(
    chunk.metadata.language,
    "ar"
  );

  assert.strictEqual(
    chunk.metadata.approved,
    false
  );

  console.log("Tafsir chunk:");
  console.dir(chunk, {
    depth: null,
  });

  console.log(
    "\nTafsir chunk builder test: PASSED ✅"
  );
}

try {
  main();
} catch (error) {
  console.error(
    "Tafsir chunk builder test: FAILED ❌"
  );

  console.error(error);

  process.exit(1);
}