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
  createSemanticVerificationProvider,
} = require("./semanticVerificationProvider");

const {
  createEvidenceVerifierService,
} = require("./evidenceVerifierService");

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

  const question =
    "What is Tawhid in Islam?";

  console.log("Question:");
  console.log(question);

  console.log("\nRetrieving evidence...\n");

  const evidence =
    await retriever.retrieve(question);

  console.log("Evidence:");
  console.dir(evidence, { depth: null });

  console.log("\nGenerating Gemini draft...\n");

  const draft =
    await draftGenerator.generateDraft({
      question,
      language: "en",
      evidence,
    });

  console.log("Draft:");
  console.dir(draft, { depth: null });

  console.log("\nRunning semantic verification...\n");

  const verification =
    await evidenceVerifier.verify({
      question,
      draft,
      evidence,
    });

  console.log("VERIFICATION:");
  console.dir(verification, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Verification returned:",
    verification ? "✅" : "❌"
  );

  console.log(
    "Status exists:",
    typeof verification.status === "string"
      ? "✅"
      : "❌"
  );

  console.log(
    "Unsupported claims array:",
    Array.isArray(verification.unsupportedClaims)
      ? "✅"
      : "❌"
  );

  console.log(
    "Warnings array:",
    Array.isArray(verification.warnings)
      ? "✅"
      : "❌"
  );

  console.log(
    "Risk flags array:",
    Array.isArray(verification.riskFlags)
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