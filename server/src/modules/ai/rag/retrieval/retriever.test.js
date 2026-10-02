require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../../.env"),
});

const { connectMongo, closeMongo } = require("../storage/mongoClient");
const { createVoyageEmbeddingProvider } = require("../../providers/voyageEmbeddingProvider");
const { createRetriever } = require("./retriever");

async function main() {
  const db = await connectMongo();

  const embeddingProvider = createVoyageEmbeddingProvider();

  const retriever = createRetriever({
    db,
    embeddingProvider,
    topK: 3,
  });

  const question = "What is Tawhid in Islam?";

  console.log("Question:");
  console.log(question);
  console.log("\nRetrieving...\n");

  const evidence = await retriever.retrieve(question);

  console.log("EVIDENCE:\n");
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
    typeof evidence[0]?.score === "number" ? "✅" : "❌"
  );

  console.log(
    "Citation exists:",
    evidence[0]?.citation ? "✅" : "❌"
  );

  await closeMongo();
}

main().catch(async (error) => {
  console.error("\nTEST FAILED:\n");
  console.error(error);
  await closeMongo();
  process.exit(1);
});