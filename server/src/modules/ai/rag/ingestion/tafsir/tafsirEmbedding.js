const path = require("path");

const {
  parseTafsirDump,
  extractTafsirAyahs,
} = require("./tafsirParser");

const {
  buildTafsirChunks,
} = require("./tafsirChunkBuilder");

const {
  createVoyageEmbeddingProvider,
} = require("../../../providers/voyageEmbeddingProvider");

const FILE_PATH = path.resolve(
  __dirname,
  "../../../../../../data/tafsir/tafsir-book-1.json.gz"
);

async function main() {
  console.log("Reading tafsir dump...");

  const dump = parseTafsirDump(FILE_PATH);
  const ayahs = extractTafsirAyahs(dump);
  const chunks = buildTafsirChunks(ayahs);

  console.log(`Tafsir entries: ${chunks.length}`);

  const embedder = createVoyageEmbeddingProvider();

  const BATCH_SIZE = 50;
  const embeddedChunks = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    console.log(
      `Embedding ${i + 1}-${i + batch.length} / ${chunks.length}`
    );

    const embeddings = await embedder.embedBatch(
      batch.map((chunk) => chunk.text),
      { inputType: "document" }
    );

    for (let j = 0; j < batch.length; j++) {
      embeddedChunks.push({
        ...batch[j],
        embedding: embeddings[j],
        model: "voyage-4-large",
        dimensions: embeddings[j].length,
      });
    }
  }

  const invalid = embeddedChunks.filter(
    (chunk) => chunk.embedding.length !== 1024
  );

  console.log(`Embedded chunks: ${embeddedChunks.length}`);
  console.log(`Invalid dimensions: ${invalid.length}`);

  if (invalid.length > 0) {
    throw new Error("Some embeddings have invalid dimensions");
  }

  console.log("Tafsir embedding completed successfully.");

  return embeddedChunks;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});