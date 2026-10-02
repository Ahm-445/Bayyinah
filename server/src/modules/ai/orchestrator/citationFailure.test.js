const { createAIOrchestrator } = require("./aiOrchestrator");
const { createDraft } = require("../contracts/draftContract");

async function main() {
  const fakeEvidence = [
    {
      sourceId: "source-001",
      chunkId: "source-001-chunk-0001",
      text: "Valid evidence.",
      score: 0.95,
      citation: {
        sourceId: "source-001",
        chunkId: "source-001-chunk-0001",
        reference: "Valid reference",
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
    async generateDraft({ language }) {
      console.log("2. Generation");

      return createDraft({
        answer: "This answer contains an invalid citation.",
        language,
        citations: [
          {
            sourceId: "fake-source",
            chunkId: "fake-source-chunk-9999",
            sourceTitle: "Fake Source",
            reference: "Fake reference",
          },
        ],
      });
    },
  };

  const citationVerifier = {
    verifyCitations(draft, evidence) {
      console.log("3. Citation verification");

      return {
        status: "FAIL",
        citationValid: false,
        evidenceSupported: true,
        unsupportedClaims: [],
        missingCitations: [
          "fake-source:fake-source-chunk-9999",
        ],
        riskFlags: [],
        warnings: [],
      };
    },
  };

  const evidenceVerifier = {
    async verify() {
      throw new Error(
        "❌ Semantic verification should NOT be called after citation failure"
      );
    },
  };

  const orchestrator = createAIOrchestrator({
    retriever,
    draftGenerator,
    citationVerifier,
    evidenceVerifier,
  });

  const result = await orchestrator.processQuestion({
    questionId: "test-citation-failure-001",
    text: "What is Islam?",
    language: "en",
  });

  console.log("\nFINAL RESULT:\n");
  console.dir(result, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Action ABSTAIN:",
    result.action === "ABSTAIN" ? "✅" : "❌"
  );

  console.log(
    "Draft exists:",
    result.draft !== null ? "✅" : "❌"
  );

  console.log(
    "Verification FAIL:",
    result.verification?.status === "FAIL" ? "✅" : "❌"
  );

  console.log(
    "Citation invalid:",
    result.verification?.citationValid === false ? "✅" : "❌"
  );

  console.log(
    "Missing citation detected:",
    result.verification?.missingCitations?.length > 0
      ? "✅"
      : "❌"
  );
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED\n");
  console.error(error);
  process.exit(1);
});
