const {
  createClassificationResult,
} = require("../contracts/classificationContract");

const { detectCategory } = require("./categoryDetector");
const { detectLevel, isOffTopicPersonalQuestion } = require("./levelDetector");
const { AI_ACTIONS } = require("../contracts/aiTypes");
const { detectRisk } = require("./riskDetector");
const { detectAction } = require("./actionDetector");
const { detectLanguage } = require("./languageDetector");

/**
 * Classifies a question through the initial Bayyinah
 * deterministic classification layer.
 *
 * The classifier does not generate an answer.
 * It only determines:
 * - category
 * - scientific level
 * - risk
 * - next AI action
 *
 * @param {string} questionText
 * @returns {Object}
 */
function classifyQuestion(questionText) {
  if (!questionText || typeof questionText !== "string") {
    throw new Error("Question text is required");
  }

  const category = detectCategory(questionText);
  const language = detectLanguage(questionText);
  const level = detectLevel(questionText);
  const risk = detectRisk(level);
  const offTopic = isOffTopicPersonalQuestion(questionText);
  // A personal question with nothing religious in it is out of scope.
  const action = offTopic ? AI_ACTIONS.ABSTAIN : detectAction(level);

  const reasons = [
    `Detected category: ${category}`,
    `Detected level: ${level}`,
    `Detected risk: ${risk}`,
    ...(offTopic ? ["Personal question without a religious subject: outside the scope of Islamic sources"] : []),
    `Recommended action: ${action}`,
  ];

  return createClassificationResult({
    category,
    level,
    risk,
    action,
    language,
    reasons,
  });
}

module.exports = {
  classifyQuestion,
};
