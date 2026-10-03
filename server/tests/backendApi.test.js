const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

function makeResult(action = "ANSWER", overrides = {}) {
  return {
    action,
    classification: { category: "aqeedah", level: "A", risk: "low", action, reasons: [] },
    safety: { decision: "ALLOW", reason: "Safe for a source-based answer." },
    evidence: [{ sourceId: "source-1", chunkId: "chunk-1", text: "Supported evidence", score: 0.9,
      citation: { sourceTitle: "Source", reference: "1:1", sourceType: "quran", internal: "omit" } }],
    draft: action === "ANSWER" ? { answer: "A draft answer.", language: "en", citations: [{ sourceId: "source-1", chunkId: "chunk-1" }] } : null,
    verification: action === "ANSWER" ? { status: "PASS", citationValid: true, evidenceSupported: true, unsupportedClaims: [], missingCitations: [], warnings: [], riskFlags: [] } : null,
    ...overrides,
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
    async updateOne(filter, update) {
      const question = records.get(filter.questionId);
      if (question) Object.assign(question, update.$set);
      return { modifiedCount: question ? 1 : 0 };
    },
  };
}

function makeDraftModel() {
  const records = new Map();
  let nextId = 1;
  const matches = (record, filter) => Object.entries(filter).every(([key, value]) => String(record[key]) === String(value));
  return {
    records,
    async create(data) {
      const draft = { ...data, _id: String(nextId++).padStart(24, "0"), createdAt: new Date() };
      records.set(draft._id, draft);
      return draft;
    },
    async find(filter) { return [...records.values()].filter((record) => matches(record, filter)); },
    async findOne(filter) { return [...records.values()].find((record) => matches(record, filter)) || null; },
    async findOneAndUpdate(filter, update) {
      const draft = [...records.values()].find((record) => matches(record, filter));
      if (!draft) return null;
      Object.assign(draft, update.$set);
      return draft;
    },
  };
}

async function withServer(t, { action = "ANSWER", fail = false, resultOverrides = {} } = {}) {
  const Question = makeQuestionModel();
  const Draft = makeDraftModel();
  const calls = [];
  const aiService = {
    async answerQuestion(input) {
      calls.push(input);
      if (fail) throw new Error("provider secret and stack must not escape");
      return makeResult(action, resultOverrides);
    },
  };
  const server = createApp({ Question, Draft, aiService, databaseState: () => true }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { base: `http://127.0.0.1:${server.address().port}`, Question, Draft, calls };
}

test("GET /api/health returns safe health status", async (t) => {
  const { base } = await withServer(t);
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(await response.json()).sort(), ["db", "status", "uptime"]);
});

test("a valid question calls AI and returns an unpublished draft", async (t) => {
  const { base, calls, Question, Draft } = await withServer(t);
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
  assert.equal(Draft.records.size, 1);
  assert.equal([...Draft.records.values()][0].status, "pending_review");
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

test("review queue publishes only after approval and published answers become readable", async (t) => {
  const { base, Draft, Question } = await withServer(t);
  const submitted = await fetch(`${base}/api/questions/q-publish/ai-answer`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "What is Tawhid?" }),
  });
  const pending = await submitted.json();
  const queueResponse = await fetch(`${base}/api/review/drafts`);
  const queue = await queueResponse.json();
  assert.equal(queue.drafts.length, 1);
  assert.equal(queue.drafts[0].draftStatus, "pending_review");
  assert.equal(queue.drafts[0].published, false);

  const hiddenBeforeReview = await fetch(`${base}/api/questions/q-publish/published-answer`);
  assert.equal(hiddenBeforeReview.status, 404);

  const approval = await fetch(`${base}/api/review/drafts/${pending.draftId}/decision`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  const decision = await approval.json();
  assert.equal(approval.status, 200);
  assert.equal(decision.draftStatus, "published");
  assert.equal(decision.published, true);
  assert.equal(Draft.records.get(pending.draftId).status, "published");
  assert.equal(Question.records.get("q-publish").status, "answered");

  const visibleAfterReview = await fetch(`${base}/api/questions/q-publish/published-answer`);
  assert.equal(visibleAfterReview.status, 200);
  assert.equal((await visibleAfterReview.json()).published, true);
});

test("unsafe, abstained, or referred results are not put in the review queue", async (t) => {
  for (const [action, overrides] of [
    ["ABSTAIN", {}],
    ["REFER", {}],
    ["ANSWER", { safety: { decision: "BLOCK", reason: "Blocked" } }],
  ]) {
    const { base, Draft } = await withServer(t, { action, resultOverrides: overrides });
    const response = await fetch(`${base}/api/questions/q-no-review-${action}/ai-answer`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Question" }),
    });
    const result = await response.json();
    assert.equal(result.published, false);
    assert.equal(result.draftStatus, null);
    assert.equal(Draft.records.size, 0);
    const queue = await fetch(`${base}/api/review/drafts`).then((res) => res.json());
    assert.equal(queue.drafts.length, 0);
  }
});

test("review requires warning acknowledgement and rejects repeat decisions", async (t) => {
  const { base } = await withServer(t, {
    resultOverrides: {
      safety: { decision: "REVIEW", reason: "Manual review needed." },
      verification: { status: "NEEDS_REVIEW", citationValid: true, evidenceSupported: true, warnings: ["Review the source."], riskFlags: [], unsupportedClaims: [], missingCitations: [] },
    },
  });
  const submission = await fetch(`${base}/api/questions/q-warning/ai-answer`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "A question" }),
  }).then((res) => res.json());
  const path = `${base}/api/review/drafts/${submission.draftId}/decision`;
  const unacknowledged = await fetch(path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "approve" }),
  });
  assert.equal(unacknowledged.status, 422);
  const acknowledged = await fetch(path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "approve", acknowledgeWarnings: true }),
  });
  assert.equal(acknowledged.status, 200);
  const repeated = await fetch(path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "reject" }),
  });
  assert.equal(repeated.status, 404);
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
