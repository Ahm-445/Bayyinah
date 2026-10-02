require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../../.env"),
});

const {
  createVoyageEmbeddingProvider,
} = require("../../providers/voyageEmbeddingProvider");

const {
  connectMongo,
  closeMongo,
} = require("../storage/mongoClient");

const {
  createVectorRetriever,
} = require("./vectorRetriever");

async function main() {
  try {
    const db = await connectMongo();

    const embeddingProvider =
      createVoyageEmbeddingProvider();

    const retriever = createVectorRetriever({
      db,
      embeddingProvider,
      topK: 3,
    });

    const question = "What is Tawhid in Islam?";

    console.log("Question:");
    console.log(question);

    console.log("\nRetrieving...");

    const evidence = await retriever.retrieve(question);

    console.log("\nRESULTS:\n");
    console.dir(evidence, { depth: null });

    console.log("\nASSERTIONS:\n");

    console.log(
      "Evidence returned:",
      evidence.length > 0 ? "✅" : "❌"
    );

    console.log(
      "Correct chunk found:",
      evidence.some(
        (item) => item.chunkId === "test-real-chunk-001"
      )
        ? "✅"
        : "❌"
    );

    console.log(
      "Score exists:",
      evidence.every(
        (item) =>
          typeof item.score === "number"
      )
        ? "✅"
        : "❌"
    );

    console.log(
      "Citation exists:",
      evidence.every(
        (item) => item.citation
      )
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
