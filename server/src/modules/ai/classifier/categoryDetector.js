const { QUESTION_CATEGORIES } = require("../contracts/aiTypes");
const { CLASSIFIER_RULES } = require("./classifierRules");
const { normalizeText } = require("./textNormalizer");
const { getCategoryPriority } = require("./categoryPriority");
const { detectRequiredSourceTypes } = require("./sourceRequirements");

function isQuranTextRequest(text) {
  const englishTextRequest = /\b(show|give|display|provide)\b.*\b(first|opening)\b.*\b(verse|ayah)\b|\bwhat is\b.*\b(quran|qur'an)\b.*\b(verse|ayah)\b.*\b\d+\s*:\s*\d+/.test(text);
  const arabicTextRequest = /(اعطني|اعرض|اظهر|هات).*(الايه|ايه).*(الاول|الاولي)|نص.*(الايه|ايه)|(الايه|ايه).*(الاول|الاولي).*(سوره|الفاتحه)/.test(text);
  return englishTextRequest || arabicTextRequest;
}

function isTafsirIntent(text) {
  if (/\btafsir\b|تفسير/.test(text)) return true;
  const englishInterpretation = /\b(meaning|mean|explain|explanation|interpret|interpretation|why)\b/.test(text);
  const englishQuranReference = /\b(surah|verse|ayah|fatihah|al-fatihah)\b/.test(text);
  const arabicInterpretation = /(معني|معنى|اشرح|تفسير|لماذا|سبب)/.test(text);
  const arabicQuranReference = /(سوره|سورة|ايه|اية|الفاتحه|الفاتحة)/.test(text);
  return (englishInterpretation && englishQuranReference) ||
    (arabicInterpretation && arabicQuranReference) ||
    /\bwhy\b.*\b(verse|ayah)\b/.test(text);
}

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

  if (isQuranTextRequest(normalizedText)) return QUESTION_CATEGORIES.QURAN;
  if (isTafsirIntent(normalizedText)) return QUESTION_CATEGORIES.TAFSIR;

  const requiredSources = detectRequiredSourceTypes(questionText);
  if (
    requiredSources.includes("quran") &&
    requiredSources.includes("hadith") &&
    /(tawhid|oneness of god|التوحيد)/.test(normalizedText)
  ) return QUESTION_CATEGORIES.AQEEDAH;

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
  isTafsirIntent,
  isQuranTextRequest,
};
