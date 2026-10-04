const mongoose = require("mongoose");

const Draft = require("../models/Draft");
const Answer = require("../models/Answer");
const Question = require("../models/Question");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/ids");
const { draftView, queueItem } = require("../services/serializers");
const { citationsFromText } = require("../services/citations");
const { computeScore } = require("../services/scoring");
const { recordAudit } = require("../services/audit");

const MAX_TEXT_LENGTH = 20000;
const MAX_REASON_LENGTH = 1000;
const OPEN = ["in_review", "blocked"];

const isAdmin = (req) => req.user.role === "admin";

/** A dāʿī sees only their own drafts; an admin sees all. Others get 404. */
async function findDraft(req) {
  const draft = isObjectId(req.params.id)
    ? await Draft.findById(req.params.id)
    : null;

  if (!draft || (!isAdmin(req) && String(draft.daeeId) !== req.user.id)) {
    throw new HttpError(404, "Draft not found.");
  }

  return draft;
}

function assertOpen(draft) {
  if (!OPEN.includes(draft.status)) {
    throw new HttpError(409, `This draft was already ${draft.status}.`);
  }
}

function readText(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "Draft text cannot be empty.");
  }

  if (value.length > MAX_TEXT_LENGTH) {
    throw new HttpError(
      400,
      `Draft text is too long (max ${MAX_TEXT_LENGTH} characters).`
    );
  }

  return value;
}

async function dashboard(req, res) {
  const scope = isAdmin(req)
    ? {}
    : { daeeId: new mongoose.Types.ObjectId(req.user.id) };

  const [grouped, referred, queue, score] = await Promise.all([
    Draft.aggregate([{ $match: scope }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    Draft.countDocuments({ ...scope, aiAction: "REFER" }),
    Draft.find({ ...scope, status: { $in: OPEN } })
      .sort({ createdAt: -1 })
      .limit(200),
    computeScore(req.user.id),
  ]);

  const count = (...statuses) =>
    grouped
      .filter((row) => statuses.includes(row._id))
      .reduce((sum, row) => sum + row.n, 0);

  res.json({
    stats: {
      pending: count(...OPEN), // equals the queue length
      approved: count("approved"),
      rejected: count("rejected"),
      referred,
      score: score.total,
      scoreBreakdown: score.breakdown,
    },
    queue: queue.map(queueItem),
  });
}

async function get(req, res) {
  res.json(draftView(await findDraft(req)));
}

/** Saves a new version of the dāʿī's text. */
async function update(req, res) {
  const draft = await findDraft(req);
  assertOpen(draft);

  const text = readText(req.body?.text);
  const version = { text, editedAt: new Date(), editedBy: req.user.id };

  const updated = await Draft.findOneAndUpdate(
    { _id: draft._id, status: { $in: OPEN } },
    { $set: { text }, $push: { versions: version } },
    { returnDocument: "after" }
  );

  if (!updated) throw new HttpError(409, "This draft was already closed.");

  res.json(draftView(updated));
}

/**
 * Publishes the dāʿī's final text as an answer under their name. The draft
 * stays for the other dāʿīs. Sources are taken from the final text, not from
 * the AI draft. `text` may be sent with the request to save and publish at once.
 */
async function approve(req, res) {
  const draft = await findDraft(req);
  assertOpen(draft);

  const body = req.body ?? {};
  const edited = body.text !== undefined;
  const text = edited ? readText(body.text) : draft.text;

  if (draft.verification?.status === "FAIL") {
    throw new HttpError(
      422,
      "This AI draft failed verification and cannot be published.",
      "verification_failed"
    );
  }

  if (draft.requiresAcknowledgement && body.acknowledgeWarnings !== true) {
    throw new HttpError(
      422,
      "Please confirm you have reviewed this answer and take responsibility for it.",
      "warnings_not_acknowledged"
    );
  }

  if (!text?.trim()) {
    throw new HttpError(400, "Write the answer before approving.");
  }

  const now = new Date();
  const change = { $set: { status: "approved", text, closedAt: now } };

  if (edited && text !== draft.text) {
    change.$push = { versions: { text, editedAt: now, editedBy: req.user.id } };
  }

  // Closing the draft first makes a double click or a second tab harmless.
  const closed = await Draft.findOneAndUpdate(
    { _id: draft._id, status: { $in: OPEN } },
    change,
    { returnDocument: "after" }
  );

  if (!closed) throw new HttpError(409, "This draft was already closed.");

  let answer;

  try {
    answer = await Answer.create({
      questionId: draft.questionId,
      daeeId: draft.daeeId,
      draftId: draft._id,
      finalText: text,
      citations: citationsFromText(text, draft.evidence),
      verificationStatus: draft.verification?.status ?? null,
      aiAssisted: Boolean(draft.generatedText),
      publishedAt: now,
    });
  } catch (error) {
    // Re-open the draft so the dāʿī is not left with a closed draft and no answer.
    await Draft.updateOne(
      { _id: draft._id },
      { $set: { status: draft.status }, $unset: { closedAt: 1 } }
    );

    if (error.code === 11000) {
      throw new HttpError(409, "You already answered this question.");
    }
    throw error;
  }

  await Promise.all([
    Draft.updateOne({ _id: draft._id }, { $set: { answerId: answer._id } }),
    Question.updateOne({ _id: draft.questionId }, { status: "answered" }),
  ]);

  await recordAudit({
    actorId: req.user.id,
    action: "draft.approve",
    entityType: "draft",
    entityId: draft._id,
    metadata: {
      answerId: String(answer._id),
      acknowledged: body.acknowledgeWarnings === true,
      aiAction: draft.aiAction,
      verification: draft.verification?.status ?? null,
    },
  });

  res.json({ answerId: String(answer._id) });
}

async function reject(req, res) {
  const draft = await findDraft(req);
  assertOpen(draft);

  const reason =
    typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

  if (!reason || reason.length > MAX_REASON_LENGTH) {
    throw new HttpError(400, "Please give a reason for rejecting.");
  }

  const rejected = await Draft.findOneAndUpdate(
    { _id: draft._id, status: { $in: OPEN } },
    { $set: { status: "rejected", rejectReason: reason, closedAt: new Date() } }
  );

  if (!rejected) throw new HttpError(409, "This draft was already closed.");

  await recordAudit({
    actorId: req.user.id,
    action: "draft.reject",
    entityType: "draft",
    entityId: draft._id,
    metadata: { reason },
  });

  res.json({ status: "rejected" });
}

module.exports = { dashboard, get, update, approve, reject };
