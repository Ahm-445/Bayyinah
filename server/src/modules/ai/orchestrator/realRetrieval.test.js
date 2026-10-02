const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../../..", ".env"),
});
const { connectMongo, closeMongo } = require("../rag/storage/mongoClient");
const { createVoyageEmbeddingProvider } = require("../providers/voyageEmbeddingProvider");
const { createRetriever } = require("../rag/retrieval/retriever");

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

  // Temporary test doubles for the stages after retrieval.
  const draftGenerator = {
    async generateDraft({ question, language, evidence }) {
      return {
        answer: `Test answer for: ${question}`,
        language,
        citations: evidence.map((item) => ({
          sourceId: item.sourceId,
          chunkId: item.chunkId,
          sourceTitle: null,
          reference: item.citation?.reference || null,
        })),
      };
    },
  };

  const citationVerifier = {
    async verifyCitations() {
      return {
        status: "PASS",
        citationValid: true,
        evidenceSupported: true,
        missingCitations: [],
        unsupportedClaims: [],
        warnings: [],
        riskFlags: [],
      };
    },
  };

  const evidenceVerifier = {
    async verify() {
      return {
        status: "PASS",
        evidenceSupported: true,
        unsupportedClaims: [],
        warnings: [],
        riskFlags: [],
      };
    },
  };

  const orchestrator = createAIOrchestrator({
    retriever,
    draftGenerator,
    citationVerifier,
    evidenceVerifier,
  });

  const result = await orchestrator.processQuestion({
    questionId: "real-retrieval-test-001",
    text: "What is Tawhid in Islam?",
    language: "en",
  });

  console.log("\nAI RESULT:\n");
  console.dir(result, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Action:",
    result.action === "ANSWER" ? "✅" : "❌"
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
    "Real evidence returned:",
    result.evidence.length > 0 ? "✅" : "❌"
  );

  console.log(
    "Correct chunk found:",
    result.evidence.some(
      (item) => item.chunkId === "test-real-chunk-001"
    )
      ? "✅"
      : "❌"
  );

  console.log(
    "Draft generated:",
    result.draft ? "✅" : "❌"
  );

  console.log(
    "Verification passed:",
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