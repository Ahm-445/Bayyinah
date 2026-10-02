require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../../.env"),
});

const { connectMongo, closeMongo } = require("./mongoClient");
const { createChunkStore } = require("./chunkStore");

async function main() {
  try {
    const db = await connectMongo();
    const store = createChunkStore(db);

    const chunk = {
      chunkId: "test-chunk-001",
      sourceId: "test-source-001",
      text: "Islam teaches the worship of one God.",
      metadata: {
        title: "Test Source",
        language: "en",
      },
      embedding: [0.1, 0.2, 0.3],
      model: "test-model",
      dimensions: 3,
    };

    const inserted = await store.insertChunk(chunk);
    const found = await store.findByChunkId(chunk.chunkId);
    const count = await store.countChunks();

    console.log("\nINSERTED:");
    console.dir(inserted, { depth: null });

    console.log("\nFOUND:");
    console.dir(found, { depth: null });

    console.log("\nCOUNT:", count);

    console.log("\nASSERTIONS:");

    console.log(
      "Inserted: ",
      inserted.chunkId === chunk.chunkId ? "✅" : "❌"
    );

    console.log(
      "Found:    ",
      found?.chunkId === chunk.chunkId ? "✅" : "❌"
    );

    console.log(
      "Embedding:",
      Array.isArray(found?.embedding) ? "✅" : "❌"
    );

    console.log(
      "Collection count:",
      count > 0 ? "✅" : "❌"
    );

    await closeMongo();
  } catch (error) {
    console.error("\n❌ TEST FAILED\n");
    console.error(error);
    process.exit(1);
  }
}

main();
