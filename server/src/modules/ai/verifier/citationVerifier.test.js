require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../.env"),
});

const {
  connectMongo,
  closeMongo,
} = require("../rag/storage/mongoClient");

const {
  createVoyageEmbeddingProvider,
} = require("../providers/voyageEmbeddingProvider");

const {
  createGeminiLLMProvider,
} = require("../providers/geminiLLMProvider");

const {
  createRetriever,
} = require("../rag/retrieval/retriever");

const {
  createDraftGenerator,
} = require("../generator/draftGenerator");

const {
  verifyCitations,
} = require("./citationVerifier");

async function main() {
  const db = await connectMongo();

  const embeddingProvider =
    createVoyageEmbeddingProvider();

  const retriever = createRetriever({
    db,
    embeddingProvider,
    topK: 3,
  });

  const llmProvider =
    createGeminiLLMProvider();

  const draftGenerator =
    createDraftGenerator({
      llmProvider,
      model: "gemini-3.1-flash-lite",
    });

  const question =
    "What is Tawhid in Islam?";

  console.log("Question:");
  console.log(question);

  console.log("\nRetrieving evidence...\n");

  const evidence =
    await retriever.retrieve(question);

  console.log("Generating Gemini draft...\n");

  const draft =
    await draftGenerator.generateDraft({
      question,
      language: "en",
      evidence,
    });

  console.log("DRAFT:\n");
  console.dir(draft, { depth: null });

  console.log("\nVerifying citations...\n");

  const verification =
    verifyCitations(draft, evidence);

  console.log("VERIFICATION:\n");
  console.dir(verification, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Citation valid:",
    verification.citationValid === true
      ? "✅"
      : "❌"
  );

  console.log(
    "Missing citations:",
    verification.missingCitations.length === 0
      ? "✅"
      : "❌"
  );

  console.log(
    "Status:",
    verification.status === "PASS"
      ? "✅"
      : "❌"
  );

  await closeMongo();
}

main().catch(async (error) => {
  console.error("\nTEST FAILED:\n");
  console.error(error);

  await closeMongo();

  process.exit(1);
});
