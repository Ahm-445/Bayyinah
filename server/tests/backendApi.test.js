const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { createAIOrchestrator } = require("../src/modules/ai/orchestrator/aiOrchestrator");
const { createDraftGenerator } = require("../src/modules/ai/generator/draftGenerator");
const { verifyCitations } = require("../src/modules/ai/verifier/citationVerifier");
const { createVerificationResult } = require("../src/modules/ai/contracts/verificationContract");
const { AI_ACTIONS } = require("../src/modules/ai/contracts/aiTypes");
const { createAIResult } = require("../src/modules/ai/contracts/aiResultContract");
const { detectAction } = require("../src/modules/ai/classifier/actionDetector");
const DraftSchemaModel = require("../src/models/Draft");
const QuestionSchemaModel = require("../src/models/Question");

function makeResult(action = "ANSWER", overrides = {}) {
  return {
    action,
    aiAction: action,
    classification: { category: "aqeedah", level: "A", risk: "low", action, reasons: [] },
    safety: { decision: "ALLOW", reason: "Safe for a source-based answer." },
    evidence: [{ sourceId: "source-1", chunkId: "chunk-1", text: "Supported evidence", score: 0.9,
      citation: { sourceTitle: "Source", reference: "Surah 112, ayah 1", sourceType: "quran", language: "ar", surahName: "سورة الإخلاص", surahNumber: 112, ayahNumber: 1, internal: "omit" } }],
    draft: action === "ANSWER" ? { answer: "A draft answer.", language: "en", citations: [{ sourceId: "source-1", chunkId: "chunk-1" }] } : null,
    verification: action === "ANSWER" ? { status: "PASS", citationValid: true, evidenceSupported: true, unsupportedClaims: [], missingCitations: [], warnings: [], riskFlags: [] } : null,
    ...overrides,
  };
}

const QURAN_EVIDENCE = [{
  sourceId: "quranpedia-quran-hafs",
  chunkId: "quran-hafs-112-1",
  text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
  score: 0.95,
  citation: {
    sourceTitle: "Quran",
    reference: "Surah 112, ayah 1",
    sourceType: "quran",
    category: "quran",
    language: "ar",
    surahName: "سورة الإخلاص",
    surahNumber: 112,
    ayahNumber: 1,
  },
}];

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

async function withPipelineServer(t, { evidence = QURAN_EVIDENCE, onRetrieve = () => {} } = {}) {
  const Question = makeQuestionModel();
  const Draft = makeDraftModel();
  const draftGenerator = createDraftGenerator({
    llmProvider: {
      async generate(prompt) {
        return prompt.includes("Arabic (ar). Write the complete answer in Arabic.")
          ? "الإسلام يقوم على عبادة الله وحده."
          : "Islam teaches worship of Allah alone.";
      },
    },
  });
  const orchestrator = createAIOrchestrator({
    retriever: {
      async retrieve() {
        onRetrieve();
        return evidence;
      },
    },
    draftGenerator,
    citationVerifier: { verifyCitations },
    evidenceVerifier: {
      async verify() {
        return createVerificationResult({
          status: "PASS",
          citationValid: true,
          evidenceSupported: true,
        });
      },
    },
  });
  const aiService = { answerQuestion: (input) => orchestrator.processQuestion(input) };
  const server = createApp({ Question, Draft, aiService, databaseState: () => true }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { base: `http://127.0.0.1:${server.address().port}`, Question, Draft };
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
  assert.equal(body.aiAction, "ANSWER");
  assert.equal(body.draft.answer, "A draft answer.");
  assert.equal(body.draftStatus, "pending_review");
  assert.equal(body.published, false);
  assert.equal(body.status, "awaiting_review");
  assert.equal(body.evidence[0].citation.internal, undefined);
  assert.equal(body.evidence[0].reference, "Surah 112, ayah 1");
  assert.equal(body.evidence[0].surahNumber, 112);
  assert.equal(body.evidence[0].ayahNumber, 1);
  assert.equal(body.evidence[0].sourceType, "quran");
  assert.equal(body.evidence[0].language, "ar");
  assert.equal(Question.records.get("q-1").status, "awaiting_review");
  assert.equal(Draft.records.size, 1);
  assert.equal([...Draft.records.values()][0].status, "pending_review");
  assert.equal([...Draft.records.values()][0].aiAction, "ANSWER");
});

for (const { text, language, expectedReference } of [
  { text: "ما هو الإسلام؟", language: "ar", expectedReference: "(الإخلاص 112:1)" },
  { text: "What is Islam?", language: "en", expectedReference: "(Al-Ikhlas 112:1)" },
]) {
  test(`${language} answer passes through the AI pipeline and returns the full frontend contract`, async (t) => {
    const { base, Draft, Question } = await withPipelineServer(t);
    const response = await fetch(`${base}/api/questions/q-language-${language}/ai-answer`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, language }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.aiAction, "ANSWER");
    assert.equal(body.action, "ANSWER");
    assert.equal(body.classification.category, "general_islam");
    assert.ok(body.classification.level);
    assert.ok(body.classification.risk);
    assert.ok(body.safety.decision);
    assert.ok(body.safety.reason);
    assert.ok(Array.isArray(body.evidence) && body.evidence.length > 0);
    assert.equal(body.evidence[0].text, QURAN_EVIDENCE[0].text);
    assert.equal(body.evidence[0].surahNumber, 112);
    assert.equal(body.evidence[0].ayahNumber, 1);
    assert.equal(body.evidence[0].sourceType, "quran");
    assert.equal(body.evidence[0].language, "ar");
    assert.ok(body.draft.answer);
    assert.equal(body.draft.language, language);
    assert.ok(body.draft.answer.includes(expectedReference));
    assert.equal(body.verification.status, "PASS");
    assert.equal(typeof body.verification.citationValid, "boolean");
    assert.equal(typeof body.verification.evidenceSupported, "boolean");
    assert.ok(Array.isArray(body.verification.unsupportedClaims));
    assert.ok(Array.isArray(body.verification.missingCitations));
    assert.ok(Array.isArray(body.verification.warnings));
    assert.equal(body.published, false);
    assert.equal(body.draftStatus, "pending_review");
    assert.equal(Question.records.get(`q-language-${language}`).aiAction, "ANSWER");
    assert.equal(Draft.records.size, 1);
  });
}

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

test("unsafe, abstained, and referred results are stored for review but never presented as published answers", async (t) => {
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
    assert.equal(result.aiAction, action);
    assert.equal(result.draftStatus, "pending_review");
    assert.equal(Draft.records.size, 1);
    const queue = await fetch(`${base}/api/review/drafts`).then((res) => res.json());
    assert.equal(queue.drafts.length, 1);
    assert.equal(queue.drafts[0].aiAction, action);
    assert.equal(queue.drafts[0].published, false);
  }
});

test("non-answer results can be marked reviewed but cannot be approved or published", async (t) => {
  const { base, Draft, Question } = await withServer(t, { action: "ABSTAIN" });
  const submitted = await fetch(`${base}/api/questions/q-dismiss/ai-answer`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "A question" }),
  }).then((response) => response.json());
  const approve = await fetch(`${base}/api/review/drafts/${submitted.draftId}/decision`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "approve" }),
  });
  assert.equal(approve.status, 422);
  const dismiss = await fetch(`${base}/api/review/drafts/${submitted.draftId}/decision`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "dismiss" }),
  });
  const reviewed = await dismiss.json();
  assert.equal(reviewed.aiAction, "ABSTAIN");
  assert.equal(reviewed.draftStatus, "reviewed");
  assert.equal(reviewed.published, false);
  assert.equal(Draft.records.get(submitted.draftId).status, "reviewed");
  assert.equal(Question.records.get("q-dismiss").status, "reviewed");
  assert.equal((await fetch(`${base}/api/questions/q-dismiss/published-answer`)).status, 404);
});

test("the actual pipeline stores REFER and ABSTAIN outcomes with structured fields", async (t) => {
  let retrievalCalls = 0;
  const referred = await withPipelineServer(t, { onRetrieve: () => { retrievalCalls += 1; } });
  const referResponse = await fetch(`${referred.base}/api/questions/q-divorce/ai-answer`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "ما حكم طلاقي من زوجتي؟", language: "ar" }),
  });
  const refer = await referResponse.json();
  assert.equal(refer.aiAction, "REFER");
  assert.equal(refer.classification.level, "D");
  assert.equal(refer.safety.decision, "BLOCK");
  assert.ok(refer.safety.reason);
  assert.deepEqual(refer.evidence, []);
  assert.equal(refer.draft, null);
  assert.equal(refer.verification, null);
  assert.equal(refer.published, false);
  assert.equal(refer.draftStatus, "pending_review");
  assert.equal(retrievalCalls, 0);
  assert.equal(referred.Draft.records.size, 1);

  const abstained = await withPipelineServer(t, { evidence: [] });
  const abstainResponse = await fetch(`${abstained.base}/api/questions/q-no-evidence/ai-answer`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "What is Islam?", language: "en" }),
  });
  const abstain = await abstainResponse.json();
  assert.equal(abstain.aiAction, "ABSTAIN");
  assert.ok(abstain.classification.category);
  assert.equal(abstain.safety.decision, "REVIEW");
  assert.ok(abstain.safety.reason);
  assert.deepEqual(abstain.evidence, []);
  assert.equal(abstain.draft, null);
  assert.equal(abstain.verification, null);
  assert.equal(abstain.published, false);
  assert.equal(abstain.draftStatus, "pending_review");
  assert.equal(abstained.Draft.records.size, 1);
  const queue = await fetch(`${abstained.base}/api/review/drafts`).then((response) => response.json());
  assert.equal(queue.drafts[0].aiAction, "ABSTAIN");
  assert.equal(queue.drafts[0].draft, null);
});

test("CLARIFY is accepted by the AI result contract but is not emitted by the current classifier", () => {
  const result = createAIResult({
    action: AI_ACTIONS.CLARIFY,
    classification: { category: "other", level: "A", risk: "low", action: "CLARIFY", reasons: [] },
    safety: { decision: "ALLOW", reason: "Question needs more detail." },
    evidence: [],
    draft: null,
    verification: null,
  });
  assert.equal(result.action, AI_ACTIONS.CLARIFY);
  assert.ok(Object.values(AI_ACTIONS).includes("CLARIFY"));
  for (const level of ["A", "B", "C", "D"]) assert.notEqual(detectAction(level), AI_ACTIONS.CLARIFY);
});

test("Question and Draft schemas retain all supported AI actions when no draft or verification exists", async () => {
  for (const aiAction of Object.values(AI_ACTIONS)) {
    const question = new QuestionSchemaModel({ questionId: `schema-${aiAction}`, text: "Question", aiAction, status: "awaiting_review" });
    await question.validate();

    const result = new DraftSchemaModel({
      questionId: `schema-${aiAction}`,
      questionText: "Question",
      action: aiAction,
      aiAction,
      classification: { category: "other", level: "A", risk: "low" },
      safety: { decision: "REVIEW", reason: "Needs review." },
      evidence: [],
      draft: null,
      verification: null,
      status: "pending_review",
    });
    await result.validate();
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
