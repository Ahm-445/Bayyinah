const {
  QUESTION_CATEGORIES,
  QUESTION_LEVELS,
  RISK_LEVELS,
  AI_ACTIONS,
} = require("./aiTypes");

/**
 * Creates a normalized classification result.
 *
 * The classifier determines:
 * - what the question is about
 * - which scientific level it belongs to
 * - its risk level
 * - what the AI pipeline should do next
 *
 * @param {Object} input
 * @param {string} input.category
 * @param {string} input.level
 * @param {string} input.risk
 * @param {string} input.action
 * @param {string} input.language
 * @param {string[]} [input.reasons]
 * @returns {Object}
 */
function createClassificationResult({
  category,
  level,
  risk,
  action,
  language,
  reasons = [],
}) {
  if (!Object.values(QUESTION_CATEGORIES).includes(category)) {
    throw new Error(`Invalid question category: ${category}`);
  }

  if (!Object.values(QUESTION_LEVELS).includes(level)) {
    throw new Error(`Invalid question level: ${level}`);
  }

  if (!Object.values(RISK_LEVELS).includes(risk)) {
    throw new Error(`Invalid risk level: ${risk}`);
  }

  if (!Object.values(AI_ACTIONS).includes(action)) {
    throw new Error(`Invalid AI action: ${action}`);
  }

  if (!["ar", "en"].includes(language)) {
    throw new Error("language must be ar or en");
  }

  if (!Array.isArray(reasons)) {
    throw new Error("reasons must be an array");
  }

  return {
    category,
    level,
    risk,
    action,
    language,
    reasons,
  };
}

module.exports = {
  createClassificationResult,
};
