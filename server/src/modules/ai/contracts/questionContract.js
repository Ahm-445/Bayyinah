const { QUESTION_CATEGORIES } = require("./aiTypes");

/**
 * Creates the normalized question object that enters
 * the Bayyinah AI pipeline.
 *
 * The AI should receive only the information it actually needs.
 *
 * @param {Object} input
 * @param {string} input.questionId
 * @param {string} input.text
 * @param {string} input.language
 * @returns {Object}
 */
function createQuestionInput({ questionId, text, language }) {
  if (!questionId || typeof questionId !== "string") {
    throw new Error("questionId is required");
  }

  if (!text || typeof text !== "string") {
    throw new Error("question text is required");
  }

  if (!language || typeof language !== "string") {
    throw new Error("language is required");
  }

  return {
    questionId,
    text: text.trim(),
    language: language.toLowerCase(),
  };
}

module.exports = {
  createQuestionInput,
};