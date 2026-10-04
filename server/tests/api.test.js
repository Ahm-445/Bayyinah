// Integration tests: real Express app + real MongoDB, fake AI.
// They run only against the throw-away database "bayyinah_test" and drop it
// afterwards. They never touch the shared "bayyinah" database.

process.env.NODE_ENV = "test";
process.env.MONGODB_DB_NAME = "bayyinah_test";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const env = require("../src/config/env");
const { connectDB } = require("../src/config/db");
const { createApp } = require("../src/app");
const { createAIService } = require("../src/services/aiService");
const { createQuestionProcessor } = require("../src/services/questionProcessor");
const { hashPassword } = require("../src/services/password");
const { SCORING } = require("../src/services/scoring");
const { fakeProcessQuestion } = require("./fakeAI");

const User = require("../src/models/User");
const Question = require("../src/models/Question");
const Draft = require("../src/models/Draft");
const Answer = require("../src/models/Answer");
const Source = require("../src/models/Source");
const AuditLog = require("../src/models/AuditLog");

const PASSWORD = "demo1234";
const silent = { error() {}, warn() {}, log() {} };

describe(
  "Bayyinah API",
  { skip: !env.mongodbUri && "MONGODB_URI is not set" },
  () => {
    let server;
    let base;
    let processor;
    const tokens = {};

    async function api(method, path, { token, body } = {}) {
      const response = await fetch(`${base}/api${path}`, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      return { status: response.status, data: await response.json().catch(() => null) };
    }

    const login = async (username) =>
      (await api("POST", "/auth/login", { body: { username, password: PASSWORD } })).data.token;

    /** Questioner asks, then the background AI job is awaited. */
    async function ask(token, text, language = "en") {
      const created = await api("POST", "/questions", { token, body: { text, language } });
      assert.equal(created.status, 201);
      await processor.idle();
      return created.data.id;
    }

    async function draftIdFor(token, questionId) {
      const { data } = await api("GET", "/daee/dashboard", { token });
      return data.queue.find((item) => item.questionId === questionId)?.draftId;
    }

    before(async () => {
      assert.equal(env.mongodbDbName, "bayyinah_test", "tests must use the test database");
      await connectDB();

      const models = Object.values(mongoose.models);
      await Promise.all(models.map((model) => model.init()));
      await Promise.all(models.map((model) => model.deleteMany({})));

      const passwordHash = await hashPassword(PASSWORD);
      await User.create([
        { username: "khalid", usernameLower: "khalid", displayName: "Ustadh Khalid", role: "daee", passwordHash },
        { username: "maryam", usernameLower: "maryam", displayName: "Ustadha Maryam", role: "daee", passwordHash },
        { username: "admin", usernameLower: "admin", displayName: "Admin", role: "admin", passwordHash },
      ]);
      await Source.create({
        sourceId: "quranpedia-quran-hafs",
        title: "القرآن الكريم - حفص عن عاصم",
        domain: "quran",
        usageBasis: "test",
      });

      const aiService = createAIService({ processQuestion: fakeProcessQuestion });
      processor = createQuestionProcessor({ aiService, logger: silent });
      server = createApp({ aiService, processor }).listen(0);
      base = `http://127.0.0.1:${server.address().port}`;

      for (const name of ["khalid", "maryam", "admin"]) tokens[name] = await login(name);
    });

    after(async () => {
      server?.close();
      if (mongoose.connection.name === "bayyinah_test") {
        await mongoose.connection.dropDatabase();
      }
      await mongoose.disconnect();
    });

    describe("system and accounts", () => {
      it("reports health", async () => {
        const { status, data } = await api("GET", "/health");
        assert.equal(status, 200);
        assert.equal(data.status, "ok");
        assert.equal(data.db, "connected");
        assert.equal(data.ai, "custom");
      });

      it("registers a questioner and rejects bad input and duplicates", async () => {
        const ok = await api("POST", "/auth/register", { body: { username: "Sara", password: PASSWORD } });
        assert.equal(ok.status, 201);
        assert.equal(ok.data.user.role, "questioner");
        assert.equal(ok.data.user.username, "Sara");
        assert.ok(ok.data.token);
        assert.equal(ok.data.user.passwordHash, undefined);
        tokens.sara = ok.data.token;

        const john = await api("POST", "/auth/register", { body: { username: "john", password: PASSWORD } });
        tokens.john = john.data.token;

        const dup = await api("POST", "/auth/register", { body: { username: "SARA", password: PASSWORD } });
        assert.equal(dup.status, 409);
        assert.equal(dup.data.code, "username_taken");

        assert.equal((await api("POST", "/auth/register", { body: { username: "ab", password: PASSWORD } })).status, 400);
        assert.equal((await api("POST", "/auth/register", { body: { username: "valid_name", password: "short" } })).status, 400);
        assert.equal((await api("POST", "/auth/register", {})).status, 400);
      });

      it("logs in case-insensitively and rejects wrong credentials", async () => {
        const ok = await api("POST", "/auth/login", { body: { username: "KHALID", password: PASSWORD } });
        assert.equal(ok.status, 200);
        assert.equal(ok.data.user.role, "daee");
        assert.equal(ok.data.user.displayName, "Ustadh Khalid");

        assert.equal((await api("POST", "/auth/login", { body: { username: "khalid", password: "wrong-pass" } })).status, 401);
        assert.equal((await api("POST", "/auth/login", { body: { username: "nobody", password: PASSWORD } })).status, 401);
        assert.equal((await api("POST", "/auth/login", { body: {} })).status, 401);
      });

      it("returns the signed-in user and enforces authentication and roles", async () => {
        const me = await api("GET", "/auth/me", { token: tokens.sara });
        assert.equal(me.status, 200);
        assert.equal(me.data.username, "Sara");

        assert.equal((await api("GET", "/auth/me")).status, 401);
        assert.equal((await api("GET", "/auth/me", { token: "not-a-token" })).status, 401);
        assert.equal((await api("GET", "/daee/dashboard", { token: tokens.sara })).status, 403);
        assert.equal((await api("POST", "/questions", { token: tokens.khalid, body: { text: "hi" } })).status, 403);
        assert.equal((await api("GET", "/sources", { token: tokens.khalid })).status, 403);
      });
    });

    describe("question lifecycle (several dāʿīs, ownership, scoring)", () => {
      let questionId;
      let khalidDraft;
      let maryamDraft;
      let answerIds;

      it("validates and stores a question, then answers 201 without waiting for the AI", async () => {
        assert.equal((await api("POST", "/questions", { token: tokens.sara, body: { text: "   " } })).status, 400);
        assert.equal((await api("POST", "/questions", { token: tokens.sara, body: { text: "x".repeat(2001) } })).status, 400);
        assert.equal((await api("POST", "/questions", { token: tokens.sara, body: { text: "ok", language: "fr" } })).status, 400);

        const created = await api("POST", "/questions", {
          token: tokens.sara,
          body: { text: "Why do Muslims worship God?", language: "en" },
        });
        assert.equal(created.status, 201);
        assert.equal(created.data.status, "submitted");
        questionId = created.data.id;

        await processor.idle();
      });

      it("moves the question to awaiting_review with its classification", async () => {
        const { status, data } = await api("GET", `/questions/${questionId}`, { token: tokens.sara });
        assert.equal(status, 200);
        assert.equal(data.status, "awaiting_review");
        assert.deepEqual(data.classification, { category: "aqeedah", level: "A" });
        assert.equal(data.text, "Why do Muslims worship God?");
      });

      it("hides the question from other people (404) and lists only own questions", async () => {
        assert.equal((await api("GET", `/questions/${questionId}`, { token: tokens.john })).status, 404);
        assert.equal((await api("GET", `/questions/${questionId}/answers`, { token: tokens.john })).status, 404);
        assert.equal((await api("GET", "/questions/not-an-id", { token: tokens.sara })).status, 404);

        const mine = await api("GET", "/questions", { token: tokens.sara });
        assert.equal(mine.data.questions.length, 1);
        assert.equal((await api("GET", "/questions", { token: tokens.john })).data.questions.length, 0);
      });

      it("gives every dāʿī their own draft in the queue", async () => {
        for (const name of ["khalid", "maryam"]) {
          const { data } = await api("GET", "/daee/dashboard", { token: tokens[name] });
          assert.equal(data.queue.length, 1);
          assert.equal(data.stats.pending, 1);
          assert.equal(data.stats.score, 0);

          const item = data.queue[0];
          assert.equal(item.questionId, questionId);
          assert.equal(item.questionText, "Why do Muslims worship God?");
          assert.equal(item.level, "A");
          assert.equal(item.aiAction, "ANSWER");
          assert.equal(item.verificationStatus, "PASS");
          assert.equal(item.status, "in_review");
        }

        khalidDraft = await draftIdFor(tokens.khalid, questionId);
        maryamDraft = await draftIdFor(tokens.maryam, questionId);
        assert.notEqual(khalidDraft, maryamDraft);

        const admin = await api("GET", "/daee/dashboard", { token: tokens.admin });
        assert.equal(admin.data.queue.length, 2);
      });

      it("returns the full draft view and keeps other dāʿīs' drafts private", async () => {
        const { status, data } = await api("GET", `/drafts/${khalidDraft}`, { token: tokens.khalid });
        assert.equal(status, 200);
        assert.equal(data.aiAction, "ANSWER");
        assert.equal(data.generatedText, "AI draft text (Adh-Dhariyat 51:56).");
        assert.equal(data.text, data.generatedText);
        assert.equal(data.requiresAcknowledgement, false);
        assert.equal(data.verification.status, "PASS");
        assert.equal(data.safety.decision, "ALLOW");
        assert.equal(data.question.classification.level, "A");
        assert.equal(data.evidence.length, 2);
        assert.equal(data.evidence[0].citation.surahNumber, 51);
        assert.deepEqual(data.pipeline.map((step) => step.stage), [
          "classification", "safety", "retrieval", "generation", "verification",
        ]);

        assert.equal((await api("GET", `/drafts/${khalidDraft}`, { token: tokens.maryam })).status, 404);
        assert.equal((await api("GET", `/drafts/${khalidDraft}`, { token: tokens.admin })).status, 200);
        assert.equal((await api("GET", `/drafts/${khalidDraft}`, { token: tokens.sara })).status, 403);
      });

      it("saves edits as versions and rejects empty text", async () => {
        const edited = await api("PATCH", `/drafts/${khalidDraft}`, {
          token: tokens.khalid,
          body: { text: "Khalid's answer (Adh-Dhariyat 51:56)." },
        });
        assert.equal(edited.status, 200);
        assert.equal(edited.data.text, "Khalid's answer (Adh-Dhariyat 51:56).");
        assert.equal(edited.data.versions.length, 2);
        assert.equal(edited.data.generatedText, "AI draft text (Adh-Dhariyat 51:56).");

        assert.equal((await api("PATCH", `/drafts/${khalidDraft}`, { token: tokens.khalid, body: { text: "  " } })).status, 400);
      });

      it("publishes under the dāʿī's name with sources taken from the final text", async () => {
        const approved = await api("POST", `/drafts/${khalidDraft}/approve`, {
          token: tokens.khalid,
          body: {},
        });
        assert.equal(approved.status, 200);
        assert.ok(approved.data.answerId);

        const answer = await Answer.findById(approved.data.answerId);
        // The text cites only the Qur'an verse, so the hadith evidence is not a source.
        assert.deepEqual(answer.citations.map((c) => c.chunkId), ["quran-hafs-51-56"]);
        assert.equal(answer.verificationStatus, "PASS");
        assert.equal(answer.aiAssisted, true);
      });

      it("keeps the draft for the other dāʿī and removes it from the answerer's queue", async () => {
        const khalid = await api("GET", "/daee/dashboard", { token: tokens.khalid });
        assert.equal(khalid.data.queue.length, 0);
        assert.equal(khalid.data.stats.approved, 1);
        assert.equal(khalid.data.stats.pending, 0);
        assert.equal(khalid.data.stats.score, SCORING.PUBLISHED_ANSWER);

        const maryam = await api("GET", "/daee/dashboard", { token: tokens.maryam });
        assert.equal(maryam.data.queue.length, 1);

        const question = await api("GET", `/questions/${questionId}`, { token: tokens.sara });
        assert.equal(question.data.status, "answered");
      });

      it("refuses to publish or edit the same draft twice, even at the same time", async () => {
        assert.equal((await api("POST", `/drafts/${khalidDraft}/approve`, { token: tokens.khalid, body: {} })).status, 409);
        assert.equal((await api("PATCH", `/drafts/${khalidDraft}`, { token: tokens.khalid, body: { text: "late" } })).status, 409);

        const race = await Promise.all([
          api("POST", `/drafts/${maryamDraft}/approve`, {
            token: tokens.maryam,
            body: { text: "Maryam's answer. See Sahih al-Bukhari 1 and (Adh-Dhariyat 51:56)." },
          }),
          api("POST", `/drafts/${maryamDraft}/approve`, {
            token: tokens.maryam,
            body: { text: "Maryam's answer. See Sahih al-Bukhari 1 and (Adh-Dhariyat 51:56)." },
          }),
        ]);
        assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
        assert.equal(await Answer.countDocuments({ questionId }), 2);
      });

      it("shows the questioner every answer without verification details", async () => {
        const { status, data } = await api("GET", `/questions/${questionId}/answers`, { token: tokens.sara });
        assert.equal(status, 200);
        assert.equal(data.selectedAnswerId, null);
        assert.equal(data.answers.length, 2);

        const [first, second] = data.answers;
        assert.equal(first.daee.displayName, "Ustadh Khalid");
        assert.equal(first.finalText, "Khalid's answer (Adh-Dhariyat 51:56).");
        assert.equal(second.daee.displayName, "Ustadha Maryam");
        assert.equal(second.citations.length, 2, "both cited sources are listed");
        assert.ok(first.publishedAt);
        for (const answer of data.answers) {
          assert.equal(answer.verification, undefined);
          assert.equal(answer.verificationStatus, undefined);
          assert.equal(answer.aiAssisted, undefined);
        }

        answerIds = data.answers.map((a) => a.id);
      });

      it("lets only the owner select, once, and scores +1 per answer and +10 per selection", async () => {
        assert.equal((await api("POST", `/answers/${answerIds[0]}/select`, { token: tokens.john })).status, 404);
        assert.equal((await api("POST", "/answers/not-an-id/select", { token: tokens.sara })).status, 404);

        const first = await api("POST", `/answers/${answerIds[0]}/select`, { token: tokens.sara });
        assert.equal(first.status, 201);
        assert.deepEqual(first.data, { selected: true });

        const again = await api("POST", `/answers/${answerIds[1]}/select`, { token: tokens.sara });
        assert.equal(again.status, 409);
        assert.equal(again.data.code, "already_selected");

        const answers = await api("GET", `/questions/${questionId}/answers`, { token: tokens.sara });
        assert.equal(answers.data.selectedAnswerId, answerIds[0]);

        const khalid = await api("GET", "/daee/dashboard", { token: tokens.khalid });
        const maryam = await api("GET", "/daee/dashboard", { token: tokens.maryam });
        assert.equal(khalid.data.stats.score, SCORING.PUBLISHED_ANSWER + SCORING.SELECTED_ANSWER);
        assert.equal(maryam.data.stats.score, SCORING.PUBLISHED_ANSWER);
        assert.deepEqual(khalid.data.stats.scoreBreakdown, {
          published: 1, selected: 1, publishedPoints: 1, selectedPoints: 10,
        });
      });

      it("writes an audit trail", async () => {
        const actions = (await AuditLog.find().distinct("action")).sort();
        for (const expected of ["answer.select", "draft.approve", "question.create"]) {
          assert.ok(actions.includes(expected), `missing audit action ${expected}`);
        }
      });
    });

    describe("AI results that need the dāʿī's judgement", () => {
      it("requires acknowledgement when verification needs review", async () => {
        const id = await ask(tokens.sara, "Please warn me about wording");
        const draftId = await draftIdFor(tokens.khalid, id);
        const draft = (await api("GET", `/drafts/${draftId}`, { token: tokens.khalid })).data;
        assert.equal(draft.verification.status, "NEEDS_REVIEW");
        assert.equal(draft.requiresAcknowledgement, true);

        const refused = await api("POST", `/drafts/${draftId}/approve`, { token: tokens.khalid, body: {} });
        assert.equal(refused.status, 422);
        assert.equal(refused.data.code, "warnings_not_acknowledged");

        const falsy = await api("POST", `/drafts/${draftId}/approve`, {
          token: tokens.khalid,
          body: { acknowledgeWarnings: "yes" },
        });
        assert.equal(falsy.status, 422, "only the boolean true counts");

        const ok = await api("POST", `/drafts/${draftId}/approve`, {
          token: tokens.khalid,
          body: { acknowledgeWarnings: true },
        });
        assert.equal(ok.status, 200);
        assert.equal((await Answer.findById(ok.data.answerId)).verificationStatus, "NEEDS_REVIEW");
      });

      it("keeps a referred (level D) question in the queue and lets the dāʿī answer behind a warning", async () => {
        const id = await ask(tokens.john, "Should I divorce? refer");
        const status = (await api("GET", `/questions/${id}`, { token: tokens.john })).data;
        assert.equal(status.status, "referred");
        assert.equal(status.classification.level, "D");

        const draftId = await draftIdFor(tokens.maryam, id);
        const draft = (await api("GET", `/drafts/${draftId}`, { token: tokens.maryam })).data;
        assert.equal(draft.aiAction, "REFER");
        assert.equal(draft.generatedText, null);
        assert.equal(draft.text, "");
        assert.equal(draft.verification, null);
        assert.equal(draft.requiresAcknowledgement, true);

        const dash = await api("GET", "/daee/dashboard", { token: tokens.maryam });
        assert.equal(dash.data.stats.referred, 1);
        assert.equal(dash.data.queue.find((q) => q.draftId === draftId).aiAction, "REFER");

        const noAck = await api("POST", `/drafts/${draftId}/approve`, { token: tokens.maryam, body: { text: "General guidance." } });
        assert.equal(noAck.status, 422);

        const empty = await api("POST", `/drafts/${draftId}/approve`, { token: tokens.maryam, body: { acknowledgeWarnings: true } });
        assert.equal(empty.status, 400, "nothing to publish yet");

        const ok = await api("POST", `/drafts/${draftId}/approve`, {
          token: tokens.maryam,
          body: { text: "Please consult a qualified scholar.", acknowledgeWarnings: true },
        });
        assert.equal(ok.status, 200);

        const answers = await api("GET", `/questions/${id}/answers`, { token: tokens.john });
        assert.equal(answers.data.answers.length, 1);
        assert.equal((await Answer.findById(ok.data.answerId)).aiAssisted, false);
      });

      it("saves an ABSTAIN result (no draft) in the queue instead of dropping it", async () => {
        const id = await ask(tokens.john, "Tell me something abstain");
        const draftId = await draftIdFor(tokens.khalid, id);
        assert.ok(draftId);

        const draft = (await api("GET", `/drafts/${draftId}`, { token: tokens.khalid })).data;
        assert.equal(draft.aiAction, "ABSTAIN");
        assert.equal(draft.generatedText, null);
        assert.equal(draft.requiresAcknowledgement, true);
        assert.equal(
          (await api("GET", `/questions/${id}`, { token: tokens.john })).data.status,
          "awaiting_review"
        );
      });

      it("marks the question failed when the AI throws, and creates no drafts", async () => {
        const id = await ask(tokens.john, "This will boom");
        const question = (await api("GET", `/questions/${id}`, { token: tokens.john })).data;
        assert.equal(question.status, "failed");
        assert.equal(await Draft.countDocuments({ questionId: id }), 0);
      });
    });

    describe("Arabic text", () => {
      it("stores and returns Arabic unchanged and finds an Arabic verse reference in the final text", async () => {
        const question = "ما معنى التوحيد في الإسلام؟";
        const finalText = "التوحيد هو إفراد الله بالعبادة (الذاريات 51:56).";

        const id = await ask(tokens.sara, question, "ar");
        const stored = (await api("GET", `/questions/${id}`, { token: tokens.sara })).data;
        assert.equal(stored.text, question);
        assert.equal(stored.language, "ar");

        const draftId = await draftIdFor(tokens.khalid, id);
        const approved = await api("POST", `/drafts/${draftId}/approve`, {
          token: tokens.khalid,
          body: { text: finalText },
        });
        assert.equal(approved.status, 200);

        const { data } = await api("GET", `/questions/${id}/answers`, { token: tokens.sara });
        assert.equal(data.answers[0].finalText, finalText);
        // "51:56" in Arabic wording still matches the Qur'an evidence, not the hadith.
        assert.deepEqual(data.answers[0].citations.map((c) => c.chunkId), ["quran-hafs-51-56"]);
      });

      it("does not treat 151:56 or 51:567 as a citation of 51:56", async () => {
        const id = await ask(tokens.john, "Another question");
        const draftId = await draftIdFor(tokens.khalid, id);
        await api("POST", `/drafts/${draftId}/approve`, {
          token: tokens.khalid,
          body: { text: "See 151:56 and 51:567 only." },
        });

        const { data } = await api("GET", `/questions/${id}/answers`, { token: tokens.john });
        assert.deepEqual(data.answers[0].citations, []);
      });
    });

    describe("rejecting", () => {
      it("needs a reason, closes the draft and blocks further changes", async () => {
        const id = await ask(tokens.sara, "A question to reject");
        const draftId = await draftIdFor(tokens.khalid, id);

        assert.equal((await api("POST", `/drafts/${draftId}/reject`, { token: tokens.khalid, body: {} })).status, 400);

        const rejected = await api("POST", `/drafts/${draftId}/reject`, {
          token: tokens.khalid,
          body: { reason: "Out of scope" },
        });
        assert.deepEqual(rejected.data, { status: "rejected" });

        assert.equal((await api("POST", `/drafts/${draftId}/approve`, { token: tokens.khalid, body: {} })).status, 409);
        assert.equal((await api("POST", `/drafts/${draftId}/reject`, { token: tokens.khalid, body: { reason: "again" } })).status, 409);

        const dash = await api("GET", "/daee/dashboard", { token: tokens.khalid });
        assert.equal(dash.data.stats.rejected, 1);
        assert.ok(!dash.data.queue.some((q) => q.draftId === draftId));
      });
    });

    describe("source registry", () => {
      it("serves a source to any signed-in user and 404s unknown ones", async () => {
        const ok = await api("GET", "/sources/quranpedia-quran-hafs", { token: tokens.khalid });
        assert.equal(ok.status, 200);
        assert.equal(ok.data.domain, "quran");
        assert.equal(ok.data.active, true);

        assert.equal((await api("GET", "/sources/nope", { token: tokens.khalid })).status, 404);
        assert.equal((await api("GET", "/sources/quranpedia-quran-hafs")).status, 401);
      });

      it("lets only an admin list and toggle sources", async () => {
        const list = await api("GET", "/sources", { token: tokens.admin });
        assert.equal(list.status, 200);
        assert.equal(list.data.sources.length, 1);

        assert.equal((await api("PATCH", "/sources/quranpedia-quran-hafs", { token: tokens.khalid, body: { active: false } })).status, 403);
        assert.equal((await api("PATCH", "/sources/quranpedia-quran-hafs", { token: tokens.admin, body: { active: "no" } })).status, 400);

        const off = await api("PATCH", "/sources/quranpedia-quran-hafs", { token: tokens.admin, body: { active: false } });
        assert.equal(off.data.active, false);
      });
    });

    describe("robustness", () => {
      it("answers unknown routes and broken JSON with the documented error shape", async () => {
        const missing = await api("GET", "/nope");
        assert.equal(missing.status, 404);
        assert.equal(missing.data.code, "not_found");

        const broken = await fetch(`${base}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{not json",
        });
        assert.equal(broken.status, 400);
        assert.equal((await broken.json()).code, "invalid_json");
      });

      it("marks unfinished questions as failed after a restart", async () => {
        const stuck = await Question.create({
          ownerId: (await User.findOne({ usernameLower: "sara" }))._id,
          text: "stuck",
          status: "drafting",
        });
        await Question.collection.updateOne(
          { _id: stuck._id },
          { $set: { createdAt: new Date(Date.now() - 60 * 60 * 1000) } }
        );

        assert.equal(await processor.recoverStuck(), 1);
        assert.equal((await Question.findById(stuck._id)).status, "failed");
      });
    });
  }
);
