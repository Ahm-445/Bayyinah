const Question = require("../models/Question");
const Answer = require("../models/Answer");
const Selection = require("../models/Selection");
const User = require("../models/User");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/ids");
const { questionView, answerView } = require("../services/serializers");
const { recordAudit } = require("../services/audit");

const MAX_QUESTION_LENGTH = 2000;
const LANGUAGES = ["ar", "en"];

/** A question owned by the signed-in questioner; anyone else gets 404. */
async function findOwnQuestion(req, id) {
  const question = isObjectId(id) ? await Question.findById(id) : null;

  if (!question || String(question.ownerId) !== req.user.id) {
    throw new HttpError(404, "Question not found.");
  }

  return question;
}

function createQuestionController({ processor }) {
  /** Saves the question and returns at once; the AI runs in the background. */
  async function create(req, res) {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const language = req.body?.language ?? "en";

    if (text.length < 1 || text.length > MAX_QUESTION_LENGTH) {
      throw new HttpError(
        400,
        `Question must be between 1 and ${MAX_QUESTION_LENGTH} characters.`
      );
    }

    if (!LANGUAGES.includes(language)) {
      throw new HttpError(400, 'Language must be "ar" or "en".');
    }

    const question = await Question.create({
      ownerId: req.user.id,
      text,
      language,
    });

    await recordAudit({
      actorId: req.user.id,
      action: "question.create",
      entityType: "question",
      entityId: question._id,
    });

    processor.enqueue(question._id);

    res.status(201).json({ id: String(question._id), status: question.status });
  }

  async function list(req, res) {
    const questions = await Question.find({ ownerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ questions: questions.map(questionView) });
  }

  async function get(req, res) {
    res.json(questionView(await findOwnQuestion(req, req.params.id)));
  }

  async function answers(req, res) {
    const question = await findOwnQuestion(req, req.params.id);

    const [published, selection] = await Promise.all([
      Answer.find({ questionId: question._id }).sort({ publishedAt: 1 }),
      Selection.findOne({ questionId: question._id }),
    ]);

    const daees = await User.find({
      _id: { $in: published.map((answer) => answer.daeeId) },
    });
    const byId = new Map(daees.map((daee) => [String(daee._id), daee]));

    res.json({
      selectedAnswerId: selection ? String(selection.answerId) : null,
      answers: published.map((answer) =>
        answerView(answer, byId.get(String(answer.daeeId)))
      ),
    });
  }

  return { create, list, get, answers };
}

module.exports = { createQuestionController, findOwnQuestion };
