const { createAIOrchestrator } = require("./aiOrchestrator");

async function main() {
  const retriever = {
    async retrieve(question) {
      console.log("1. Retrieval:", question);

      return [
        {
          sourceId: "weak-source",
          chunkId: "weak-source-chunk-0001",
          text: "Weak and barely relevant evidence.",
          score: 0.3,
          citation: {
            sourceId: "weak-source",
            chunkId: "weak-source-chunk-0001",
            reference: "Weak reference",
          },
        },
      ];
    },
  };

  const draftGenerator = {
    async generateDraft() {
      throw new Error("❌ Generation should NOT be called");
    },
  };

  const citationVerifier = {
    verifyCitations() {
      throw new Error("❌ Citation verification should NOT be called");
    },
  };

  const evidenceVerifier = {
    async verify() {
      throw new Error("❌ Semantic verification should NOT be called");
    },
  };

  const orchestrator = createAIOrchestrator({
    retriever,
    draftGenerator,
    citationVerifier,
    evidenceVerifier,
  });

  const result = await orchestrator.processQuestion({
    questionId: "test-insufficient-001",
    text: "What is Islam?",
    language: "en",
  });

  console.log("\nFINAL RESULT:\n");
  console.dir(result, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Evidence retrieved:",
    result.evidence.length > 0 ? "✅" : "❌"
  );

  console.log(
    "Action ABSTAIN:",
    result.action === "ABSTAIN" ? "✅" : "❌"
  );

  console.log(
    "No draft:",
    result.draft === null ? "✅" : "❌"
  );

  console.log(
    "No verification:",
    result.verification === null ? "✅" : "❌"
  );

  console.log(
    "Safety REVIEW:",
    result.safety.decision === "REVIEW" ? "✅" : "❌"
  );

  console.log(
    "Reason mentions insufficient evidence:",
    result.safety.reason.toLowerCase().includes("insufficient")
      ? "✅"
      : "❌"
  );
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED\n");
  console.error(error);
  process.exit(1);
});
