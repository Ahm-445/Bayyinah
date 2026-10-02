const {
  QUESTION_LEVELS,
  AI_ACTIONS,
} = require("../contracts/aiTypes");

/**
 * Determines the initial AI action from the question level.
 *
 * Level D questions involve personal cases or individual rulings,
 * so the AI should refer the seeker to a qualified human specialist
 * rather than provide an independent personal ruling.
 *
 * @param {string} level
 * @returns {string}
 */
function detectAction(level) {
  switch (level) {
    case QUESTION_LEVELS.A:
      return AI_ACTIONS.ANSWER;

    case QUESTION_LEVELS.B:
      return AI_ACTIONS.ANSWER;

    case QUESTION_LEVELS.C:
      return AI_ACTIONS.ANSWER;

    case QUESTION_LEVELS.D:
      return AI_ACTIONS.REFER;

    default:
      throw new Error(`Invalid question level: ${level}`);
  }
}

module.exports = {
  detectAction,
};