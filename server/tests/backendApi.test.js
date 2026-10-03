const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

function makeResult(action = "ANSWER") {
  return {
    action,
    classification: { category: "aqeedah", level: "A", risk: "low", action, reasons: [] },
    safety: { decision: "ALLOW", reason: "Safe for a source-based answer." },
    evidence: [{ sourceId: "source-1", chunkId: "chunk-1", text: "Supported evidence", score: 0.9,
      citation: { sourceTitle: "Source", reference: "1:1", sourceType: "quran", internal: "omit" } }],
    draft: action === "ANSWER" ? { answer: "A draft answer.", language: "en", citations: [{ sourceId: "source-1", chunkId: "chunk-1" }] } : null,
    verification: action === "ANSWER" ? { status: "PASS", citationValid: true, evidenceSupported: true, unsupportedClaims: [], missingCitations: [], warnings: [], riskFlags: [] } : null,
  };
}

function makeQuestionModel() {
  const records = new Map();
  return {
    records,
    async findOne({ questionId }) { return records.get(questionId) || null; },
    async create(data) {
      const question = {
        ...data,
        async save() { records.set(this.questionId, this); },
      };
      records.set(data.questionId, question);
      return question;
    },
  };
}

async function withServer(t, { action = "ANSWER", fail = false } = {}) {
  const Question = makeQuestionModel();
  const calls = [];
  const aiService = {
    async answerQuestion(input) {
      calls.push(input);
      if (fail) throw new Error("provider secret and stack must not escape");
      return makeResult(action);
    },
  };
  const server = createApp({ Question, aiService, databaseState: () => true }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { base: `http://127.0.0.1:${server.address().port}`, Question, calls };
}

test("GET /api/health returns safe health status", async (t) => {
  const { base } = await withServer(t);
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(await response.json()).sort(), ["db", "status", "uptime"]);
});

test("a valid question calls AI and returns an unpublished draft", async (t) => {
  const { base, calls, Question } = await withServer(t);
  const response = await fetch(`${base}/api/questions/q-1/ai-answer`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "What is Tawhid?", language: "en" }),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { questionId: "q-1", text: "What is Tawhid?", language: "en" });
  assert.equal(body.action, "ANSWER");
  assert.equal(body.draft.answer, "A draft answer.");
  assert.equal(body.draftStatus, "pending_review");
  assert.equal(body.published, false);
  assert.equal(body.status, "awaiting_review");
  assert.equal(body.evidence[0].citation.internal, undefined);
  assert.equal(Question.records.get("q-1").status, "awaiting_review");
});

for (const action of ["ABSTAIN", "REFER"]) {
  test(`${action} remains unchanged in the API response`, async (t) => {
    const { base } = await withServer(t, { action });
    const response = await fetch(`${base}/api/questions/q-${action}/ai-answer`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "A question" }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.action, action);
    assert.equal(body.status, action === "REFER" ? "referred" : "awaiting_review");
    assert.equal(body.published, false);
  });
}

test("provider failure is mapped to a safe failure and marks the question failed", async (t) => {
  const { base, Question } = await withServer(t, { fail: true });
  const response = await fetch(`${base}/api/questions/q-fail/ai-answer`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "A question" }),
  });
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.code, "service_unavailable");
  assert.doesNotMatch(JSON.stringify(body), /provider secret|stack/);
  assert.equal(Question.records.get("q-fail").status, "failed");
});

test("invalid requests and client AI overrides are rejected before AI runs", async (t) => {
  const { base, calls } = await withServer(t);
  const cases = [
    [{ text: " " }, 400],
    [{ text: "valid", language: "fr" }, 400],
    [{ text: "valid", action: "ANSWER" }, 400],
    [{ text: "valid", verification: { status: "PASS" } }, 400],
    [{ text: "x".repeat(2001) }, 400],
  ];
  for (const [body, status] of cases) {
    const response = await fetch(`${base}/api/questions/q-invalid/ai-answer`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal(response.status, status);
  }
  assert.equal(calls.length, 0);
});
