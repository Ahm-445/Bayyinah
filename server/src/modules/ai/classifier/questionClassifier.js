const {
  createClassificationResult,
} = require("../contracts/classificationContract");

const { detectCategory } = require("./categoryDetector");
const { detectLevel } = require("./levelDetector");
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
  const action = detectAction(level);

  const reasons = [
    `Detected category: ${category}`,
    `Detected level: ${level}`,
    `Detected risk: ${risk}`,
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
