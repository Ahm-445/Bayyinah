import assert from "node:assert/strict";
import test from "node:test";
import { decideDraft, getPublishedAnswer, getReviewQueue, submitQuestion } from "./api.js";

test("submitQuestion posts only the question text and language to the AI endpoint", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/questions/question-1/ai-answer");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { text: "ما هو الإسلام؟", language: "ar" });
    return Response.json({ action: "ANSWER", published: false });
  };
  assert.deepEqual(await submitQuestion({ questionId: "question-1", text: "ما هو الإسلام؟", language: "ar" }), {
    action: "ANSWER", published: false,
  });
});

test("review API loads queue and sends a reviewer decision", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return Response.json(url === "/api/review/drafts" ? { drafts: [] } : { draftStatus: "published", published: true });
  };
  assert.deepEqual(await getReviewQueue(), { drafts: [] });
  assert.deepEqual(await decideDraft({ draftId: "draft-1", decision: "approve", acknowledgeWarnings: true }), {
    draftStatus: "published", published: true,
  });
  assert.equal(calls[1].url, "/api/review/drafts/draft-1/decision");
  assert.deepEqual(JSON.parse(calls[1].options.body), { decision: "approve", acknowledgeWarnings: true });
});

test("published answer API reads the seeker-visible answer only by question ID", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url) => {
    assert.equal(url, "/api/questions/question-2/published-answer");
    return Response.json({ questionId: "question-2", published: true });
  };
  assert.deepEqual(await getPublishedAnswer("question-2"), { questionId: "question-2", published: true });
});

test("API errors retain safe server messages and status codes", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "Acknowledge the review warnings before publishing", code: "warnings_not_acknowledged" }), { status: 422 });
  await assert.rejects(
    decideDraft({ draftId: "draft-1", decision: "approve" }),
    (error) => error.status === 422 && error.code === "warnings_not_acknowledged"
  );
});
