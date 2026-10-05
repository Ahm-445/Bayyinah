require("dotenv").config();

const assert = require("assert");

const {
  parseQuranpediaDump,
  extractHafsAyahs,
} = require("./quranParser");

const {
  buildQuranChunk,
} = require("./quranChunkBuilder");

const {
  createVoyageEmbeddingProvider,
} = require("../../../providers/voyageEmbeddingProvider");

const dumpPath =
  "data/quran/mushafs-1.json.gz";

async function main() {
  console.log("Loading Quran...");

  const dump = parseQuranpediaDump(dumpPath);
  const ayahs = extractHafsAyahs(dump);

  const selected = ayahs.filter(
    (ayah) =>
      (ayah.surahNumber === 1 && ayah.ayahNumber === 1) ||
      (ayah.surahNumber === 2 && ayah.ayahNumber === 255) ||
      (ayah.surahNumber === 112 && ayah.ayahNumber === 1)
  );

  assert.strictEqual(selected.length, 3);

  const chunks = selected.map(buildQuranChunk);

  console.log("Selected:", chunks.length);

  const embeddingProvider =
    createVoyageEmbeddingProvider();

  for (const chunk of chunks) {
    console.log(
      `Embedding ${chunk.metadata.reference}...`
    );

    const embedding =
      await embeddingProvider.embed(
        chunk.text,
        { inputType: "document" }
      );

    assert.ok(Array.isArray(embedding));
    assert.strictEqual(embedding.length, 1024);

    console.log(
      `${chunk.metadata.reference}: ${embedding.length} dimensions ✅`
    );
  }

  console.log(
    "Quran embedding test: PASSED"
  );
}

main().catch((error) => {
  console.error(
    "Quran embedding test: FAILED"
  );
  console.error(error);
  process.exit(1);
});