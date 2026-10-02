const { QUESTION_LEVELS } = require("../contracts/aiTypes");
const { CLASSIFIER_RULES } = require("./classifierRules");
const { normalizeText } = require("./textNormalizer");

/**
 * Detects whether a question appears to be a personal case.
 *
 * This is an initial safety signal, not a final decision.
 *
 * @param {string} questionText
 * @returns {boolean}
 */
function hasPersonalCaseIndicators(questionText) {
  const normalizedText = normalizeText(questionText);

  const indicators =
    CLASSIFIER_RULES.indicators.personalCase;

  return indicators.some((indicator) =>
    normalizedText.includes(indicator.toLowerCase())
  );
}

/**
 * Detects indicators of disputed or high-sensitivity questions.
 *
 * @param {string} questionText
 * @returns {boolean}
 */
function hasSensitiveOrDisputedIndicators(questionText) {
  const normalizedText = normalizeText(questionText);

  const indicators =
    CLASSIFIER_RULES.indicators.sensitiveOrDisputed;

  return indicators.some((indicator) =>
    normalizedText.includes(indicator.toLowerCase())
  );
}

/**
 * Detects indicators of explanation, definition,
 * or reasoning questions.
 *
 * @param {string} questionText
 * @returns {boolean}
 */
function hasExplanationIndicators(questionText) {
  const normalizedText = normalizeText(questionText);

  const indicators = [
    "what does",
    "what is the meaning of",
    "what is meant by",
    "why",
    "how does",
    "how do",
    "explain",
    "explanation",
    "meaning of",
    "define",
    "definition",
  ];

  return indicators.some((indicator) =>
    normalizedText.includes(indicator)
  );
}

/**
 * Detects the initial question level.
 *
 * For now, only Level D is detected explicitly.
 * Other levels will be added after testing D.
 *
 * @param {string} questionText
 * @returns {string}
 */
function detectLevel(questionText) {
  if (hasPersonalCaseIndicators(questionText)) {
    return QUESTION_LEVELS.D;
  }

  if (hasSensitiveOrDisputedIndicators(questionText)) {
    return QUESTION_LEVELS.C;
  }

  if (hasExplanationIndicators(questionText)) {
    return QUESTION_LEVELS.B;
  }

  return QUESTION_LEVELS.A;
}

module.exports = {
  hasPersonalCaseIndicators,
  hasSensitiveOrDisputedIndicators,
  hasExplanationIndicators,
  detectLevel,
};