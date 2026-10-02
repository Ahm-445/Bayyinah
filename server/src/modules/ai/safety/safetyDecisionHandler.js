const {
  SAFETY_DECISIONS,
} = require("./safetyGate");

const {
  AI_ACTIONS,
} = require("../contracts/aiTypes");

/**
 * Converts a safety decision into a pipeline action.
 *
 * @param {Object} safety
 * @param {string} safety.decision
 * @param {string} safety.reason
 * @returns {Object}
 */
function handleSafetyDecision(safety) {
  if (!safety || typeof safety !== "object") {
    throw new Error("Safety result is required");
  }

  const { decision, reason } = safety;

  if (
    !Object.values(SAFETY_DECISIONS).includes(decision)
  ) {
    throw new Error(
      `Invalid safety decision: ${decision}`
    );
  }

  if (!reason || typeof reason !== "string") {
    throw new Error("Safety reason is required");
  }

  switch (decision) {
    case SAFETY_DECISIONS.ALLOW:
      return {
        action: AI_ACTIONS.ANSWER,
        shouldGenerate: true,
        requiresReview: false,
        reason,
      };

    case SAFETY_DECISIONS.REVIEW:
      return {
        action: AI_ACTIONS.ANSWER,
        shouldGenerate: true,
        requiresReview: true,
        reason,
      };

    case SAFETY_DECISIONS.BLOCK:
      return {
        action: AI_ACTIONS.REFER,
        shouldGenerate: false,
        requiresReview: true,
        reason,
      };

    default:
      throw new Error(
        `Unsupported safety decision: ${decision}`
      );
  }
}

module.exports = {
  handleSafetyDecision,
};