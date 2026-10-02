const {
  QUESTION_LEVELS,
  RISK_LEVELS,
} = require("../contracts/aiTypes");

/**
 * Detects the initial risk level from the classified
 * question level.
 *
 * This is a baseline risk signal.
 * Additional safety signals can be added later.
 *
 * @param {string} level
 * @returns {string}
 */
function detectRisk(level) {
  switch (level) {
    case QUESTION_LEVELS.A:
      return RISK_LEVELS.LOW;

    case QUESTION_LEVELS.B:
      return RISK_LEVELS.LOW;

    case QUESTION_LEVELS.C:
      return RISK_LEVELS.MEDIUM;

    case QUESTION_LEVELS.D:
      return RISK_LEVELS.HIGH;

    default:
      throw new Error(`Invalid question level: ${level}`);
  }
}

module.exports = {
  detectRisk,
};