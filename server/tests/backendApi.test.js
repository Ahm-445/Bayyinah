const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeAIResult } = require("../src/services/aiService");

test("backend adapter preserves the complete AI result and evidence provenance", () => {
  const input = {
    action: "ABSTAIN",
    classification: {
      category: "general_islam",
      level: "A",
      risk: "low",
      action: "ANSWER",
      language: "ar",
      reasons: ["Classification recommends answering; retrieval later abstained."],
    },
    safety: { decision: "ALLOW", reason: "Safe topic." },
    evidence: [{
      sourceId: "source-1",
      chunkId: "chunk-1",
      text: "Evidence text",
      score: 0.93,
      metadata: { sourceVersion: "v1", language: "ar" },
      citation: { reference: "112:1", sourceType: "quran" },
    }],
    draft: null,
    clarificationQuestion: null,
    verification: {
      status: "FAIL",
      citationValid: false,
      evidenceSupported: false,
      warnings: ["Unsupported claim"],
      riskFlags: ["citation_mismatch"],
    },
  };

  const result = normalizeAIResult(input);
  assert.equal(result.action, "ABSTAIN");
  assert.equal(result.aiAction, "ABSTAIN");
  assert.deepEqual(result.classification, input.classification);
  assert.deepEqual(result.safety, input.safety);
  assert.equal(result.evidence[0].sourceId, "source-1");
  assert.equal(result.evidence[0].chunkId, "chunk-1");
  assert.deepEqual(result.evidence[0].metadata, input.evidence[0].metadata);
  assert.equal(result.evidence[0].citation.reference, "112:1");
  assert.deepEqual(result.verification, input.verification);
});

test("backend adapter rejects unknown AI actions instead of mapping them to ANSWER", () => {
  assert.throws(() => normalizeAIResult({ action: "PASS", classification: {}, safety: {} }));
});
