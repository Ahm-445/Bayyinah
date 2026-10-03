const HttpError = require("../utils/httpError");

const CLIENT_CONTROLLED_AI_FIELDS = new Set([
  "action", "classification", "risk", "safety", "evidence", "citations",
  "verification", "model", "prompt", "provider", "draft",
]);

function projectAIResult(result) {
  const safeEvidence = (result.evidence || []).map((item) => ({
    sourceId: item.sourceId,
    chunkId: item.chunkId,
    text: item.text,
    score: item.score,
    citation: item.citation ? {
      sourceTitle: item.citation.sourceTitle,
      reference: item.citation.reference,
      sourceType: item.citation.sourceType,
      category: item.citation.category,
      language: item.citation.language,
    } : undefined,
  }));

  return {
    action: result.action,
    classification: result.classification,
    safety: result.safety,
    evidence: safeEvidence,
    draft: result.draft,
    verification: result.verification,
  };
}

function isReviewableAIResult(result) {
  return result?.action === "ANSWER" &&
    result.safety?.decision !== "BLOCK" &&
    typeof result.draft?.answer === "string" &&
    ["PASS", "NEEDS_REVIEW"].includes(result.verification?.status);
}

function createQuestionController({ QuestionModel, DraftModel, aiService }) {
  async function answerQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      if (typeof questionId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(questionId)) {
        throw new HttpError(400, "Invalid questionId", "invalid_question_id");
      }

      const body = req.body === undefined ? {} : req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "Request body must be a JSON object", "invalid_request");
      }
      const keys = Object.keys(body);
      const controlled = keys.find((key) => CLIENT_CONTROLLED_AI_FIELDS.has(key));
      if (controlled) {
        throw new HttpError(400, `Client cannot provide ${controlled}`, "client_ai_override");
      }
      const unexpected = keys.find((key) => !["text", "language"].includes(key));
      if (unexpected) {
        throw new HttpError(400, `Unexpected request field: ${unexpected}`, "invalid_request");
      }
      if (body.text !== undefined && (typeof body.text !== "string" || !body.text.trim() || body.text.trim().length > 2000)) {
        throw new HttpError(400, "text must contain 1–2000 characters", "invalid_text");
      }
      if (body.language !== undefined && !["ar", "en"].includes(body.language)) {
        throw new HttpError(400, "language must be ar or en", "invalid_language");
      }

      let question = await QuestionModel.findOne({ questionId });
      if (!question) {
        if (body.text === undefined) {
          throw new HttpError(404, "Question not found; provide text to create it", "question_not_found");
        }
        question = await QuestionModel.create({
          questionId,
          text: body.text.trim(),
          ...(body.language ? { language: body.language } : {}),
          status: "processing",
        });
      } else {
        if (body.text !== undefined && body.text.trim() !== question.text) {
          throw new HttpError(409, "Question text does not match the stored question", "question_text_conflict");
        }
        if (question.status === "processing") {
          throw new HttpError(409, "Question is already being processed", "question_processing");
        }
        question.status = "processing";
        await question.save();
      }

      let result;
      let draftRecord = null;
      try {
        result = await aiService.answerQuestion({
          questionId: question.questionId,
          text: question.text,
          ...(body.language || question.language
            ? { language: body.language || question.language }
            : {}),
        });

        if (isReviewableAIResult(result)) {
          draftRecord = await DraftModel.create({
            questionId: question.questionId,
            questionText: question.text,
            action: result.action,
            classification: result.classification,
            safety: result.safety,
            evidence: result.evidence,
            draft: result.draft,
            verification: result.verification,
            status: "pending_review",
          });
        }

        question.status = result.action === "REFER" ? "referred" : "awaiting_review";
        await question.save();
      } catch (error) {
        question.status = "failed";
        await question.save();
        throw error;
      }

      res.status(200).json({
        questionId: question.questionId,
        status: question.status,
        ...projectAIResult(result),
        ...(draftRecord ? { draftId: String(draftRecord._id) } : {}),
        draftStatus: draftRecord ? "pending_review" : null,
        published: false,
      });
    } catch (error) {
      next(error);
    }
  }

  return { answerQuestion };
}

module.exports = { createQuestionController, projectAIResult, isReviewableAIResult };
