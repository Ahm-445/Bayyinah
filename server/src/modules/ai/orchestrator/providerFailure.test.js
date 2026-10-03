const assert = require("node:assert/strict");
const test = require("node:test");
const { createAIOrchestrator } = require("./aiOrchestrator");

const evidence = [{
  sourceId: "quranpedia-quran-hafs",
  chunkId: "quran-hafs-112-1",
  text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
  score: 0.9,
  citation: { category: "quran", sourceType: "quran", language: "ar" },
}];

function createOrchestrator({ generationError, verificationError }) {
  return createAIOrchestrator({
    retriever: { async retrieve() { return evidence; } },
    draftGenerator: {
      async generateDraft() {
        if (generationError) throw generationError;
        return { answer: "Supported answer.", language: "en", citations: [] };
      },
    },
    citationVerifier: {
      verifyCitations() { return { status: "PASS", citationValid: true, evidenceSupported: true }; },
    },
    evidenceVerifier: {
      async verify() {
        if (verificationError) throw verificationError;
        return { status: "PASS", citationValid: true, evidenceSupported: true, unsupportedClaims: [] };
      },
    },
  });
}

test("draft provider failure fails closed as ABSTAIN without exposing provider details", async () => {
  const orchestrator = createOrchestrator({ generationError: new Error("sensitive provider details") });
  const result = await orchestrator.processQuestion({ questionId: "provider-generation-failure", text: "What does Tawhid mean?" });
  assert.equal(result.action, "ABSTAIN");
  assert.equal(result.safety.decision, "REVIEW");
  assert.equal(result.draft, null);
  assert.doesNotMatch(result.safety.reason, /sensitive provider details/);
});

test("verification provider failure fails closed as ABSTAIN and retains the draft for review", async () => {
  const orchestrator = createOrchestrator({ verificationError: new Error("sensitive provider details") });
  const result = await orchestrator.processQuestion({ questionId: "provider-verification-failure", text: "What does Tawhid mean?" });
  assert.equal(result.action, "ABSTAIN");
  assert.equal(result.safety.decision, "REVIEW");
  assert.equal(result.draft.answer, "Supported answer.");
  assert.equal(result.verification, null);
  assert.doesNotMatch(result.safety.reason, /sensitive provider details/);
});
