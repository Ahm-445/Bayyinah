const {
  QUESTION_LEVELS,
  RISK_LEVELS,
  AI_ACTIONS,
} = require("../contracts/aiTypes");

/**
 * Safety decisions.
 */
const SAFETY_DECISIONS = Object.freeze({
  ALLOW: "ALLOW",
  REVIEW: "REVIEW",
  BLOCK: "BLOCK",
});

/**
 * Determines whether the AI pipeline may continue
 * based on the question classification.
 *
 * Rules:
 * - Level A / low risk  -> ALLOW
 * - Level B / low risk  -> ALLOW
 * - Level C / medium risk -> REVIEW
 * - Level D / high risk -> BLOCK
 *
 * Important:
 * BLOCK does not mean the question is invalid.
 * It means the AI should not independently generate
 * an answer for this type of request.
 *
 * @param {Object} classification
 * @param {string} classification.level
 * @param {string} classification.risk
 * @param {string} classification.action
 * @returns {Object}
 */
function evaluateSafety(classification) {
  if (
    !classification ||
    typeof classification !== "object"
  ) {
    throw new Error("Classification is required");
  }

  const {
    level,
    risk,
    action,
  } = classification;

  if (!Object.values(QUESTION_LEVELS).includes(level)) {
    throw new Error(`Invalid question level: ${level}`);
  }

  if (!Object.values(RISK_LEVELS).includes(risk)) {
    throw new Error(`Invalid risk level: ${risk}`);
  }

  if (!Object.values(AI_ACTIONS).includes(action)) {
    throw new Error(`Invalid AI action: ${action}`);
  }

  if (level === QUESTION_LEVELS.D) {
    return {
      decision: SAFETY_DECISIONS.BLOCK,
      reason:
        "Personal or individual ruling requires referral.",
    };
  }

  if (level === QUESTION_LEVELS.C) {
    return {
      decision: SAFETY_DECISIONS.REVIEW,
      reason:
        "Disputed or high-sensitivity issue requires review.",
    };
  }

  if (
    risk === RISK_LEVELS.HIGH ||
    action === AI_ACTIONS.REFER
  ) {
    return {
      decision: SAFETY_DECISIONS.BLOCK,
      reason:
        "High-risk request requires referral.",
    };
  }

  return {
    decision: SAFETY_DECISIONS.ALLOW,
    reason:
      "Question is within the allowed automated scope.",
  };
}

module.exports = {
  SAFETY_DECISIONS,
  evaluateSafety,
};