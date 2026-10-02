const { createAIOrchestrator } = require("./aiOrchestrator");
const { createDraft } = require("../contracts/draftContract");

async function main() {
  const fakeEvidence = [
    {
      sourceId: "fiqh-001",
      chunkId: "fiqh-001-chunk-0001",
      text: "Test evidence explaining that scholars may differ in some matters.",
      score: 0.91,
      citation: {
        sourceId: "fiqh-001",
        chunkId: "fiqh-001-chunk-0001",
        reference: "Test fiqh reference",
      },
    },
  ];

  const retriever = {
    async retrieve(question) {
      console.log("1. Retrieval:", question);
      return fakeEvidence;
    },
  };

  const draftGenerator = {
    async generateDraft({ question, language, evidence }) {
      console.log("2. Generation:", question);

      return createDraft({
        answer:
          "Scholars may differ in some matters because they can interpret evidence and apply scholarly principles differently.",
        language,
        citations: evidence.map((item) => ({
          sourceId: item.sourceId,
          chunkId: item.chunkId,
          sourceTitle: "Test Fiqh Source",
          reference: item.citation.reference,
        })),
      });
    },
  };

  const citationVerifier = {
    verifyCitations(draft, evidence) {
      console.log("3. Citation verification");

      return {
        status: "PASS",
        citationValid: true,
        evidenceSupported: true,
        unsupportedClaims: [],
        missingCitations: [],
        riskFlags: [],
        warnings: [],
      };
    },
  };

  const evidenceVerifier = {
    async verify({ question, draft, evidence }) {
      console.log("4. Semantic verification:", question);

      return {
        status: "PASS",
        citationValid: true,
        evidenceSupported: true,
        unsupportedClaims: [],
        missingCitations: [],
        riskFlags: [],
        warnings: [],
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
    questionId: "test-review-001",
    text: "Why do scholars disagree about this ruling?",
    language: "en",
  });

  console.log("\nFINAL RESULT:\n");
  console.dir(result, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Level C:",
    result.classification.level === "C" ? "✅" : "❌"
  );

  console.log(
    "Risk medium:",
    result.classification.risk === "medium" ? "✅" : "❌"
  );

  console.log(
    "Action ANSWER:",
    result.action === "ANSWER" ? "✅" : "❌"
  );

  console.log(
    "Safety REVIEW:",
    result.safety.decision === "REVIEW" ? "✅" : "❌"
  );

  console.log(
    "Evidence retrieved:",
    result.evidence.length > 0 ? "✅" : "❌"
  );

  console.log(
    "Draft generated:",
    result.draft !== null ? "✅" : "❌"
  );

  console.log(
    "Verification PASS:",
    result.verification?.status === "PASS" ? "✅" : "❌"
  );
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED\n");
  console.error(error);
  process.exit(1);
});
