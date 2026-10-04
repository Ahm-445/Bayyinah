const HttpError = require("../utils/httpError");
const { projectAIResult, isReviewableAIResult } = require("./questionController");

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function needsWarningAcknowledgement(draft) {
  return draft.safety?.decision === "REVIEW" ||
    draft.verification?.status === "NEEDS_REVIEW" ||
    (draft.verification?.warnings || []).length > 0 ||
    (draft.verification?.riskFlags || []).length > 0;
}

function createReviewController({ DraftModel, QuestionModel }) {
  async function listPendingDrafts(req, res, next) {
    try {
      const drafts = await DraftModel.find({ status: "pending_review" });
      drafts.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
      res.json({
        drafts: drafts.map((draft) => ({
          draftId: String(draft._id),
          questionId: draft.questionId,
          questionText: draft.questionText,
          ...projectAIResult(draft),
          draftStatus: draft.status,
          published: false,
          createdAt: draft.createdAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async function decideDraft(req, res, next) {
    try {
      const { draftId } = req.params;
      if (!OBJECT_ID_PATTERN.test(draftId)) {
        throw new HttpError(400, "Invalid draftId", "invalid_draft_id");
      }

      const body = req.body === undefined ? {} : req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "Request body must be a JSON object", "invalid_request");
      }
      const unknown = Object.keys(body).find((key) => !["decision", "acknowledgeWarnings"].includes(key));
      if (unknown) {
        throw new HttpError(400, `Unexpected request field: ${unknown}`, "invalid_request");
      }
      if (!["approve", "reject", "dismiss"].includes(body.decision)) {
        throw new HttpError(400, "decision must be approve, reject, or dismiss", "invalid_decision");
      }
      if (body.acknowledgeWarnings !== undefined && typeof body.acknowledgeWarnings !== "boolean") {
        throw new HttpError(400, "acknowledgeWarnings must be a boolean", "invalid_request");
      }

      const existingDraft = await DraftModel.findOne({ _id: draftId, status: "pending_review" });
      if (!existingDraft) {
        throw new HttpError(404, "Pending draft not found", "draft_not_found");
      }
      const aiAction = existingDraft.aiAction || existingDraft.action;

      if (body.decision === "dismiss") {
        if (isReviewableAIResult(existingDraft)) {
          throw new HttpError(422, "An eligible answer must be approved or rejected", "invalid_review_decision");
        }
        const reviewed = await DraftModel.findOneAndUpdate(
          { _id: draftId, status: "pending_review" },
          { $set: { status: "reviewed", reviewedAt: new Date(), warningsAcknowledged: false } },
          { new: true }
        );
        if (!reviewed) throw new HttpError(409, "Result has already been reviewed", "draft_already_reviewed");
        await QuestionModel.updateOne({ questionId: reviewed.questionId }, { $set: { status: "reviewed" } });
        return res.json({ draftId, aiAction, draftStatus: "reviewed", published: false });
      }

      if (body.decision === "reject") {
        const rejected = await DraftModel.findOneAndUpdate(
          { _id: draftId, status: "pending_review" },
          { $set: { status: "rejected", reviewedAt: new Date(), warningsAcknowledged: false } },
          { new: true }
        );
        if (!rejected) throw new HttpError(409, "Draft has already been reviewed", "draft_already_reviewed");
        await QuestionModel.updateOne({ questionId: rejected.questionId }, { $set: { status: "reviewed" } });
        return res.json({ draftId, aiAction, draftStatus: "rejected", published: false });
      }

      if (!isReviewableAIResult(existingDraft)) {
        throw new HttpError(422, "This result is not eligible for publication", "publication_blocked");
      }
      if (needsWarningAcknowledgement(existingDraft) && body.acknowledgeWarnings !== true) {
        throw new HttpError(422, "Acknowledge the review warnings before publishing", "warnings_not_acknowledged");
      }

      const published = await DraftModel.findOneAndUpdate(
        { _id: draftId, status: "pending_review" },
        { $set: {
          status: "published",
          reviewedAt: new Date(),
          publishedAt: new Date(),
          warningsAcknowledged: body.acknowledgeWarnings === true,
        } },
        { new: true }
      );
      if (!published) throw new HttpError(409, "Draft has already been reviewed", "draft_already_reviewed");

      await QuestionModel.updateOne({ questionId: published.questionId }, { $set: { status: "answered" } });
      return res.json({
        draftId,
        questionId: published.questionId,
        aiAction,
        draftStatus: "published",
        published: true,
        publishedAt: published.publishedAt,
        answer: {
          text: published.draft.answer,
          language: published.draft.language,
          citations: published.draft.citations,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async function getPublishedAnswer(req, res, next) {
    try {
      const answer = await DraftModel.findOne({ questionId: req.params.questionId, status: "published" });
      if (!answer) throw new HttpError(404, "No published answer for this question", "answer_not_found");
      res.json({
        questionId: answer.questionId,
        published: true,
        publishedAt: answer.publishedAt,
        answer: {
          text: answer.draft.answer,
          language: answer.draft.language,
          citations: answer.draft.citations,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  return { listPendingDrafts, decideDraft, getPublishedAnswer };
}

module.exports = { createReviewController, needsWarningAcknowledgement };
