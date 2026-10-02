const { AI_ACTIONS } = require("./aiTypes");

function createAIResult({
  action,
  classification,
  safety,
  evidence = [],
  draft = null,
  verification = null,
}) {
  if (!Object.values(AI_ACTIONS).includes(action)) {
    throw new Error(`Invalid AI action: ${action}`);
  }

  if (!classification || typeof classification !== "object") {
    throw new Error("classification is required");
  }

  if (!safety || typeof safety !== "object") {
    throw new Error("safety is required");
  }

  if (!safety.decision || typeof safety.decision !== "string") {
    throw new Error("safety decision is required");
  }

  if (!Array.isArray(evidence)) {
    throw new Error("evidence must be an array");
  }

  if (draft !== null && typeof draft !== "object") {
    throw new Error("draft must be an object or null");
  }

  if (verification !== null && typeof verification !== "object") {
    throw new Error("verification must be an object or null");
  }

  return {
    action,
    classification,
    safety,
    evidence,
    draft,
    verification,
  };
}

module.exports = { createAIResult };