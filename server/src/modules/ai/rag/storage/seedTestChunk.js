require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../../.env"),
});

const {
  createVoyageEmbeddingProvider,
} = require("../../providers/voyageEmbeddingProvider");

const {
  connectMongo,
  closeMongo,
} = require("./mongoClient");

const {
  createChunkStore,
} = require("./chunkStore");

async function main() {
  try {
    const db = await connectMongo();
    const store = createChunkStore(db);

    const embeddingProvider = createVoyageEmbeddingProvider();

    const text =
      "Tawhid means affirming the oneness of Allah in His lordship, worship, and names and attributes.";

    console.log("Creating document embedding...");

    const embedding = await embeddingProvider.embed(text, {
      inputType: "document",
    });

    console.log("Embedding dimensions:", embedding.length);

    const chunk = {
      chunkId: "test-real-chunk-001",
      sourceId: "test-real-source-001",
      text,
      metadata: {
        title: "Test Tawhid Source",
        language: "en",
        type: "aqeedah",
        reference: "Test reference",
      },
      embedding,
      model: "voyage-4-large",
      dimensions: embedding.length,
    };

    await store.insertChunk(chunk);

    console.log("\nChunk inserted successfully.");

    console.log("\nASSERTIONS:");

    console.log(
      "1024 dimensions:",
      embedding.length === 1024 ? "✅" : "❌"
    );

    console.log(
      "Document embedding:",
      embedding.length > 0 ? "✅" : "❌"
    );

    console.log(
      "Stored chunk:",
      (await store.findByChunkId(chunk.chunkId))
        ? "✅"
        : "❌"
    );

    await closeMongo();
  } catch (error) {
    console.error("\n❌ TEST FAILED\n");
    console.error(error);
    process.exit(1);
  }
}

main();
