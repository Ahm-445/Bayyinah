const { createAIOrchestrator } = require("./aiOrchestrator");
const { createDraft } = require("../contracts/draftContract");

async function main() {
  const fakeEvidence = [
    {
      sourceId: "quran-001",
      chunkId: "quran-001-chunk-0001",
      text: "Test evidence about Islam.",
      score: 0.92,
      citation: {
        sourceId: "quran-001",
        chunkId: "quran-001-chunk-0001",
        reference: "Test reference",
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
        answer: "Islam is a religion based on worshipping one God.",
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
    questionId: "test-001",
    text: "What is Islam?",
    language: "en",
  });

  console.log("\nFINAL RESULT:\n");
  console.dir(result, { depth: null });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});