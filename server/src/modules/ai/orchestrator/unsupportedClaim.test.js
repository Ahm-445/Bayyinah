const { createAIOrchestrator } = require("./aiOrchestrator");
const { createDraft } = require("../contracts/draftContract");

async function main() {
  const fakeEvidence = [
    {
      sourceId: "source-001",
      chunkId: "source-001-chunk-0001",
      text: "Islam teaches the worship of one God.",
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
    async generateDraft({ language, evidence }) {
      console.log("2. Generation");

      return createDraft({
        answer:
          "Islam teaches the worship of one God and guarantees that every Muslim will enter Paradise.",
        language,
        citations: evidence.map((item) => ({
          sourceId: item.sourceId,
          chunkId: item.chunkId,
          sourceTitle: "Test Source",
          reference: item.citation.reference,
        })),
      });
    },
  };

  const citationVerifier = {
    verifyCitations() {
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
    async verify() {
      console.log("4. Semantic verification");

      return {
        status: "FAIL",
        citationValid: true,
        evidenceSupported: false,
        unsupportedClaims: [
          "The claim that every Muslim will enter Paradise is not supported by the provided evidence.",
        ],
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
    questionId: "test-unsupported-claim-001",
    text: "What is Islam?",
    language: "en",
  });

  console.log("\nFINAL RESULT:\n");
  console.dir(result, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Citation valid:",
    result.verification?.citationValid === true ? "✅" : "❌"
  );

  console.log(
    "Evidence NOT supported:",
    result.verification?.evidenceSupported === false ? "✅" : "❌"
  );

  console.log(
    "Unsupported claim detected:",
    result.verification?.unsupportedClaims?.length > 0
      ? "✅"
      : "❌"
  );

  console.log(
    "Verification FAIL:",
    result.verification?.status === "FAIL" ? "✅" : "❌"
  );

  console.log(
    "Action ABSTAIN:",
    result.action === "ABSTAIN" ? "✅" : "❌"
  );
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED\n");
  console.error(error);
  process.exit(1);
});
