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
} = require("../verifier/citationVerifier");

const {
  createSemanticVerificationProvider,
} = require("../verifier/semanticVerificationProvider");

const {
  createEvidenceVerifierService,
} = require("../verifier/evidenceVerifierService");

const {
  createAIOrchestrator,
} = require("./aiOrchestrator");

async function main() {
  const db = await connectMongo();

  const embeddingProvider =
    createVoyageEmbeddingProvider();

  const retriever = createRetriever({
    db,
    embeddingProvider,
    topK: 3,
  });

  const geminiProvider =
    createGeminiLLMProvider();

  const draftGenerator =
    createDraftGenerator({
      llmProvider: geminiProvider,
      model: "gemini-3.1-flash-lite",
    });

  const semanticVerificationProvider =
    createSemanticVerificationProvider({
      llmProvider: geminiProvider,
      model: "gemini-3.1-flash-lite",
    });

  const evidenceVerifier =
    createEvidenceVerifierService(
      semanticVerificationProvider
    );

  const orchestrator =
    createAIOrchestrator({
      retriever,
      draftGenerator,
      citationVerifier: {
        verifyCitations,
      },
      evidenceVerifier,
    });

  const result =
    await orchestrator.processQuestion({
      questionId: "real-orchestrator-test-001",
      text: "What is Tawhid in Islam?",
      language: "en",
    });

  console.log("\nFINAL AI RESULT:\n");
  console.dir(result, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Action:",
    result.action === "ANSWER"
      ? "✅"
      : "❌"
  );

  console.log(
    "Classification:",
    result.classification?.category === "aqeedah"
      ? "✅"
      : "❌"
  );

  console.log(
    "Safety:",
    result.safety?.decision === "ALLOW"
      ? "✅"
      : "❌"
  );

  console.log(
    "Real evidence:",
    result.evidence.length > 0
      ? "✅"
      : "❌"
  );

  console.log(
    "Correct chunk:",
    result.evidence.some(
      (item) =>
        item.chunkId === "test-real-chunk-001"
    )
      ? "✅"
      : "❌"
  );

  console.log(
    "Gemini draft:",
    result.draft?.answer
      ? "✅"
      : "❌"
  );

  console.log(
    "Citation verification:",
    result.verification?.citationValid === true
      ? "✅"
      : "❌"
  );

  console.log(
    "Evidence supported:",
    result.verification?.evidenceSupported === true
      ? "✅"
      : "❌"
  );

  console.log(
    "Final verification:",
    result.verification?.status === "PASS"
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