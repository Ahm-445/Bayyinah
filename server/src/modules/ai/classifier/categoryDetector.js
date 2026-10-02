const { QUESTION_CATEGORIES } = require("../contracts/aiTypes");
const { CLASSIFIER_RULES } = require("./classifierRules");
const { normalizeText } = require("./textNormalizer");
const { getCategoryPriority } = require("./categoryPriority");

/**
 * Detects the most relevant question category.
 *
 * When multiple categories match, the category priority
 * is used as a tie-breaker.
 *
 * @param {string} questionText
 * @returns {string}
 */
function detectCategory(questionText) {
  const normalizedText = normalizeText(questionText);

  const categoryKeywords =
    CLASSIFIER_RULES.indicators.categoryKeywords;

  let bestCategory = QUESTION_CATEGORIES.OTHER;
  let bestMatchCount = 0;
  let bestPriority = getCategoryPriority(bestCategory);

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let matchCount = 0;

    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchCount += 1;
      }
    }

    if (matchCount === 0) {
      continue;
    }

    const categoryPriority = getCategoryPriority(category);

    const isBetterMatch =
      matchCount > bestMatchCount ||
      (matchCount === bestMatchCount &&
        categoryPriority < bestPriority);

    if (isBetterMatch) {
      bestCategory = category;
      bestMatchCount = matchCount;
      bestPriority = categoryPriority;
    }
  }

  return bestCategory;
}

module.exports = {
  detectCategory,
};