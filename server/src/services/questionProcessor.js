const Question = require("../models/Question");
const Draft = require("../models/Draft");
const User = require("../models/User");
const { needsAcknowledgement } = require("./draftPolicy");

const STALE_AFTER_MS = 10 * 60 * 1000;

function isOnlyDuplicateError(error) {
  const errors = error.writeErrors || [];
  return errors.length > 0 && errors.every((e) => (e.err?.code ?? e.code) === 11000);
}

/**
 * Runs the AI pipeline for a submitted question in the background and turns
 * the result into one draft per dāʿī. POST /questions never waits for it.
 */
function createQuestionProcessor({ aiService, logger = console }) {
  const inFlight = new Set();

  async function markFailed(questionId, reason) {
    logger.error(`Question ${questionId} failed: ${reason}`);
    await Question.updateOne({ _id: questionId }, { status: "failed" });
  }

  async function run(questionId) {
    // Claim the question so it is processed once.
    const question = await Question.findOneAndUpdate(
      { _id: questionId, status: "submitted" },
      { status: "drafting" },
      { returnDocument: "after" }
    );

    if (!question) return;

    let result;

    try {
      result = await aiService.process({
        questionId: String(question._id),
        text: question.text,
        language: question.language,
      });
    } catch (error) {
      await markFailed(questionId, error.message);
      return;
    }

    try {
      const daees = await User.find({ role: "daee" }).select("_id");
      const requiresAcknowledgement = needsAcknowledgement(result);
      const generatedText = result.draft?.answer ?? null;

      const drafts = daees.map((daee) => ({
        questionId: question._id,
        daeeId: daee._id,
        status: "in_review",
        question: { text: question.text, language: question.language },
        classification: result.classification,
        action: result.action,
        aiAction: result.aiAction,
        aiResult: result,
        clarificationQuestion: result.clarificationQuestion ?? null,
        safety: result.safety,
        generatedText,
        text: generatedText ?? "",
        versions: generatedText
          ? [{ text: generatedText, editedAt: new Date() }]
          : [],
        evidence: result.evidence,
        citations: result.draft?.citations ?? [],
        verification: result.verification,
        requiresAcknowledgement,
        pipeline: result.pipeline,
      }));

      if (drafts.length === 0) {
        logger.warn("No dāʿī accounts exist: nobody can review this question");
      } else {
        await Draft.insertMany(drafts, { ordered: false }).catch((error) => {
          if (!isOnlyDuplicateError(error)) throw error;
        });
      }

      await Question.updateOne(
        { _id: questionId },
        {
          status: result.aiAction === "REFER" ? "referred" : "awaiting_review",
          classification: result.classification,
          aiAction: result.aiAction,
        }
      );
    } catch (error) {
      await markFailed(questionId, error.message);
    }
  }

  /** Starts processing without waiting. Returns the promise (used by tests). */
  function enqueue(questionId) {
    const promise = run(questionId)
      .catch((error) => logger.error("Question processor crashed:", error.message))
      .finally(() => inFlight.delete(promise));

    inFlight.add(promise);
    return promise;
  }

  /** Resolves when every running job has finished. */
  async function idle() {
    while (inFlight.size > 0) {
      await Promise.allSettled([...inFlight]);
    }
  }

  /** After a restart, jobs that were mid-flight can never finish. */
  async function recoverStuck() {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);
    const result = await Question.updateMany(
      { status: { $in: ["submitted", "drafting"] }, createdAt: { $lt: cutoff } },
      { status: "failed" }
    );

    return result.modifiedCount;
  }

  return { enqueue, idle, recoverStuck };
}

module.exports = { createQuestionProcessor };
