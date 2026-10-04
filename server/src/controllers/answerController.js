const Answer = require("../models/Answer");
const Selection = require("../models/Selection");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/ids");
const { findOwnQuestion } = require("./questionController");
const { recordAudit } = require("../services/audit");

/** Only the questioner who asked can select, once per question. */
async function select(req, res) {
  const answer = isObjectId(req.params.id)
    ? await Answer.findById(req.params.id)
    : null;

  if (!answer) throw new HttpError(404, "Answer not found.");

  // 404 (not 403) for other people's questions, so ids cannot be probed.
  const question = await findOwnQuestion(req, String(answer.questionId)).catch(
    () => {
      throw new HttpError(404, "Answer not found.");
    }
  );

  let selection;

  try {
    selection = await Selection.create({
      questionId: question._id,
      answerId: answer._id,
      ownerId: req.user.id,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(
        409,
        "You already selected an answer for this question.",
        "already_selected"
      );
    }
    throw error;
  }

  await recordAudit({
    actorId: req.user.id,
    action: "answer.select",
    entityType: "answer",
    entityId: answer._id,
    metadata: { questionId: String(question._id), daeeId: String(answer.daeeId) },
  });

  res.status(201).json({ selected: Boolean(selection) });
}

module.exports = { select };
