const { QUESTION_CATEGORIES } = require("../contracts/aiTypes");

/**
 * Category priority used when a question matches
 * multiple category keyword groups.
 *
 * More specific categories appear before broader categories.
 */
const CATEGORY_PRIORITY = Object.freeze([
  QUESTION_CATEGORIES.QURAN,
  QUESTION_CATEGORIES.HADITH,
  QUESTION_CATEGORIES.TAFSIR,
  QUESTION_CATEGORIES.AQEEDAH,
  QUESTION_CATEGORIES.FIQH,
  QUESTION_CATEGORIES.SEERAH_HISTORY,
  QUESTION_CATEGORIES.OBJECTIONS,
  QUESTION_CATEGORIES.TERMINOLOGY,
  QUESTION_CATEGORIES.TRANSLATION,
  QUESTION_CATEGORIES.GENERAL_ISLAM,
  QUESTION_CATEGORIES.OTHER,
]);

/**
 * Returns the priority position of a category.
 *
 * Lower number = higher priority.
 *
 * @param {string} category
 * @returns {number}
 */
function getCategoryPriority(category) {
  const index = CATEGORY_PRIORITY.indexOf(category);

  if (index === -1) {
    return CATEGORY_PRIORITY.length;
  }

  return index;
}

module.exports = {
  CATEGORY_PRIORITY,
  getCategoryPriority,
};