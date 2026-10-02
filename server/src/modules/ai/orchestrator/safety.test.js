const { createAIOrchestrator } = require("./aiOrchestrator");

async function main() {
  const retriever = {
    async retrieve() {
      throw new Error("❌ Retrieval should NOT be called");
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
    questionId: "test-personal-001",
    text: "My wife and I have a specific marital problem. What should I do?",
    language: "en",
  });

  console.log("\nFINAL RESULT:\n");
  console.dir(result, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Level D:",
    result.classification.level === "D" ? "✅" : "❌"
  );

  console.log(
    "Risk high:",
    result.classification.risk === "high" ? "✅" : "❌"
  );

  console.log(
    "Action REFER:",
    result.action === "REFER" ? "✅" : "❌"
  );

  console.log(
    "Safety BLOCK:",
    result.safety.decision === "BLOCK" ? "✅" : "❌"
  );

  console.log(
    "No evidence:",
    result.evidence.length === 0 ? "✅" : "❌"
  );

  console.log(
    "No draft:",
    result.draft === null ? "✅" : "❌"
  );

  console.log(
    "No verification:",
    result.verification === null ? "✅" : "❌"
  );
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED\n");
  console.error(error);
  process.exit(1);
});