const { QUESTION_LEVELS } = require("../contracts/aiTypes");
const { CLASSIFIER_RULES } = require("./classifierRules");
const { normalizeText, containsIndicator } = require("./textNormalizer");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-word match in normalized text. Arabic terms may carry the proclitics
 * و ف ب ل ك and the article ال ("والصلاة", "بالحرام").
 */
function containsTerm(normalizedText, term) {
  const needle = escapeRegExp(String(term).toLowerCase());
  if (/[ء-ي]/.test(term)) {
    return new RegExp(`(?:^|[^ء-ي])(?:[وف])?(?:[بلك])?(?:ال)?${needle}(?![ء-ي])`, "u").test(normalizedText);
  }
  return new RegExp(`(?<![a-z'])${needle}(?![a-z])`, "u").test(normalizedText);
}

function hasPersonalRulingIndicators(questionText) {
  const normalizedText = normalizeText(questionText);
  return CLASSIFIER_RULES.indicators.personalRuling.some((indicator) =>
    containsIndicator(normalizedText, indicator)
  );
}

function hasPersonalWording(questionText) {
  const normalizedText = normalizeText(questionText);
  return CLASSIFIER_RULES.indicators.personalCase.some((indicator) =>
    /[ء-ي]/.test(indicator)
      ? containsIndicator(normalizedText, indicator)
      : containsTerm(normalizedText, indicator)
  );
}

/**
 * Whether the question is about a religious matter at all.
 *
 * @param {string} questionText
 * @returns {boolean}
 */
function hasReligiousContext(questionText) {
  const normalizedText = normalizeText(questionText);
  return CLASSIFIER_RULES.indicators.religiousContext.some((term) =>
    containsTerm(normalizedText, term)
  );
}

/**
 * Detects whether a question asks for a personal religious ruling
 * (Level D). "Should I / can I / is it allowed for me" only counts when the
 * question is about a religious matter.
 *
 * This is an initial safety signal, not a final decision.
 *
 * @param {string} questionText
 * @returns {boolean}
 */
function hasPersonalCaseIndicators(questionText) {
  return hasPersonalRulingIndicators(questionText) ||
    (hasPersonalWording(questionText) && hasReligiousContext(questionText));
}

/**
 * A personal question ("Which phone should I buy?") with nothing religious
 * in it: outside Bayyinah's scope, so the AI abstains.
 *
 * @param {string} questionText
 * @returns {boolean}
 */
function isOffTopicPersonalQuestion(questionText) {
  return hasPersonalWording(questionText) && !hasPersonalCaseIndicators(questionText);
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
    containsIndicator(normalizedText, indicator)
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
    "ما معنى",
    "معنى",
    "اشرح",
    "شرح",
    "تفسير",
    "لماذا",
    "كيف",
    "ما المقصود",
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
  hasReligiousContext,
  isOffTopicPersonalQuestion,
  hasSensitiveOrDisputedIndicators,
  hasExplanationIndicators,
  detectLevel,
};
