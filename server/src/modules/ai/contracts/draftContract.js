/**
 * Creates a normalized AI-generated draft.
 *
 * Important:
 * This draft is NOT a published answer.
 * It must be verified and reviewed by the Da'i
 * before publication.
 *
 * @param {Object} input
 * @param {string} input.answer
 * @param {string} input.language
 * @param {Object[]} input.citations
 * @returns {Object}
 */
function createDraft({
  answer,
  language,
  citations = [],
}) {
  if (!answer || typeof answer !== "string") {
    throw new Error("Draft answer is required");
  }

  if (!language || typeof language !== "string") {
    throw new Error("Draft language is required");
  }

  if (!Array.isArray(citations)) {
    throw new Error("citations must be an array");
  }

  return {
    answer: answer.trim(),
    language: language.toLowerCase(),
    citations,
  };
}

module.exports = {
  createDraft,
};