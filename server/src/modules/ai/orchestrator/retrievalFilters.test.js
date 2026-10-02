const assert = require("assert");
const { createAIOrchestrator } = require("./aiOrchestrator");

async function main() {
  let receivedOptions;
  const orchestrator = createAIOrchestrator({
    retriever: {
      async retrieve(_question, options) {
        receivedOptions = options;
        return [
          {
            sourceId: "quran-source",
            chunkId: "quran-chunk-1",
            text: "Approved evidence.",
            score: 0.9,
            citation: {
              sourceTitle: "Quran source",
              reference: "Test reference",
            },
          },
        ];
      },
    },
    draftGenerator: {
      async generateDraft() {
        return {
          answer: "A sourced draft.",
          language: "en",
          citations: [],
        };
      },
    },
    citationVerifier: {
      verifyCitations() {
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
    },
    evidenceVerifier: {
      async verify() {
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
    },
  });

  await orchestrator.processQuestion({
    questionId: "filter-forwarding-test",
    text: "What does Tawhid mean?",
    language: "en",
    retrievalLanguages: ["ar", "en"],
  });

  assert.deepStrictEqual(receivedOptions, {
    category: "aqeedah",
    sourceLanguages: ["ar", "en"],
  });

  console.log("Orchestrator retrieval filter forwarding test: PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
