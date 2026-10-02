require("dotenv").config();

const assert = require("assert");

const {
  createVoyageEmbeddingProvider,
} = require("../../embeddings/voyageEmbeddingProvider");

async function main() {
  const provider =
    createVoyageEmbeddingProvider();

  const texts = [
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "قُلْ هُوَ اللَّهُ أَحَدٌ",
    "اللَّهُ الصَّمَدُ",
  ];

  console.log("Embedding batch...");

  const embeddings =
    await provider.embedBatch(texts, {
      inputType: "document",
    });

  assert.strictEqual(
    embeddings.length,
    texts.length
  );

  for (const embedding of embeddings) {
    assert.strictEqual(
      embedding.length,
      1024
    );
  }

  console.log(
    `Received ${embeddings.length} embeddings`
  );

  console.log(
    "Quran batch embedding test: PASSED"
  );
}

main().catch((error) => {
  console.error(
    "Quran batch embedding test: FAILED"
  );
  console.error(error);
  process.exit(1);
});