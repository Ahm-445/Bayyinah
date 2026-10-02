require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../.env"),
});

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
  connectMongo,
  closeMongo,
} = require("../rag/storage/mongoClient");

const {
  createDraftGenerator,
} = require("./draftGenerator");

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

  console.log("EVIDENCE:\n");
  console.dir(evidence, { depth: null });

  console.log("\nGenerating draft...\n");

  const draft =
    await draftGenerator.generateDraft({
      question,
      language: "en",
      evidence,
    });

  console.log("DRAFT:\n");
  console.dir(draft, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Evidence returned:",
    evidence.length > 0 ? "✅" : "❌"
  );

  console.log(
    "Gemini draft returned:",
    draft?.answer ? "✅" : "❌"
  );

  console.log(
    "Language:",
    draft?.language === "en" ? "✅" : "❌"
  );

  console.log(
    "Citations returned:",
    Array.isArray(draft?.citations) &&
      draft.citations.length > 0
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