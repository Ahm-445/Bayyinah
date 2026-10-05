require("dotenv").config();

const assert = require("assert");

const {
  createSemanticVerificationProvider,
} = require("../verifier/semanticVerificationProvider");

const {
  createAIOrchestrator,
} = require("./aiOrchestrator");

const {
  connectMongo,
  closeMongo,
} = require("../rag/storage/mongoClient");

const {
  createVoyageEmbeddingProvider,
} = require("../providers/voyageEmbeddingProvider");

const {
  createRetriever,
} = require("../rag/retrieval/retriever");

const {
  createGeminiLLMProvider,
} = require("../providers/geminiLLMProvider");

const {
  createDraftGenerator,
} = require("../generator/draftGenerator");

const {
  verifyCitations,
} = require("../verifier/citationVerifier");


const {
  createEvidenceVerifierService,
} = require("../verifier/evidenceVerifierService");

async function main() {
  console.log(
    "=== Quran Real Orchestrator Test ===\n"
  );

  console.log("1. Connecting to MongoDB...");

  const db = await connectMongo();

  console.log("MongoDB connected ✅");

  console.log("\n2. Creating Voyage provider...");

  const embeddingProvider =
    createVoyageEmbeddingProvider();

  console.log("Voyage provider ready ✅");

  console.log("\n3. Creating Quran retriever...");

  const retriever = createRetriever({
    db,
    embeddingProvider,
    topK: 5,
  });

  console.log("Retriever ready ✅");

  console.log("\n4. Creating Gemini provider...");

  const llmProvider =
    createGeminiLLMProvider();

  console.log("Gemini provider ready ✅");

  console.log("\n5. Creating draft generator...");

  const draftGenerator =
    createDraftGenerator({
      llmProvider,
    });

  console.log("Draft generator ready ✅");

  console.log("\n6. Creating citation verifier...");

const citationVerifier = {
  verifyCitations,
};

  console.log("Citation verifier ready ✅");

  console.log("\n7. Creating semantic verification provider...");

const semanticVerificationProvider =
  createSemanticVerificationProvider({
    llmProvider,
  });

console.log(
  "Semantic verification provider ready ✅"
);

console.log("\n8. Creating evidence verifier...");

const evidenceVerifier =
  createEvidenceVerifierService(
    semanticVerificationProvider
  );

console.log("Evidence verifier ready ✅");

  const orchestrator =
    createAIOrchestrator({
      retriever,
      draftGenerator,
      citationVerifier,
      evidenceVerifier,
    });

  console.log("Orchestrator ready ✅");

  const question =
    "What does Tawhid mean in Islam?";

  console.log(
    `\nQuestion: ${question}\n`
  );

  console.log(
    "Running full AI pipeline...\n"
  );

  const result =
    await orchestrator.processQuestion({
      questionId: "quran-real-001",
      text: question,
      language: "en",
    });

  console.log("\n=== CLASSIFICATION ===");

  console.dir(
    result.classification,
    { depth: null }
  );

  console.log("\n=== SAFETY ===");

  console.dir(
    result.safety,
    { depth: null }
  );

  console.log("\n=== EVIDENCE ===");

  console.table(
    result.evidence.map((item) => ({
      chunkId: item.chunkId,
      reference: item.citation.reference,
      score: Number(
        item.score.toFixed(4)
      ),
    }))
  );

  console.log("\n=== DRAFT ===");

  console.dir(
    result.draft,
    { depth: null }
  );

  console.log("\n=== VERIFICATION ===");

  console.dir(
    result.verification,
    { depth: null }
  );

  console.log("\n=== FINAL ACTION ===");

  console.log(result.action);

  /*
   * Basic assertions
   */

  assert.ok(
    result.classification,
    "Classification is missing"
  );

  assert.ok(
    result.safety,
    "Safety result is missing"
  );

  assert.ok(
    Array.isArray(result.evidence),
    "Evidence must be an array"
  );

  assert.ok(
    result.evidence.length > 0,
    "No evidence retrieved"
  );

  assert.ok(
    result.draft,
    "Draft was not generated"
  );

  assert.ok(
    result.verification,
    "Verification result is missing"
  );

  assert.ok(
    result.draft.answer &&
      result.draft.answer.trim().length > 0,
    "Draft answer is empty"
  );

  /*
   * Verify that Quran evidence was actually used.
   */

  const quranEvidence =
    result.evidence.filter(
      (item) =>
        item.sourceId ===
        "quranpedia-quran-hafs"
    );

  assert.ok(
    quranEvidence.length > 0,
    "No Quranpedia evidence was retrieved"
  );

  /*
   * We expect this normal foundational question
   * to reach ANSWER when verification passes.
   */

  if (
    result.verification.status === "PASS"
  ) {
    assert.strictEqual(
      result.action,
      "ANSWER"
    );
  }

  console.log(
    "\nQuran real orchestrator test: PASSED ✅"
  );

  await closeMongo();
}

main().catch(async (error) => {
  console.error(
    "\nQuran real orchestrator test: FAILED ❌"
  );

  console.error(error);

  try {
    await closeMongo();
  } catch {}

  process.exit(1);
});