/**
 * Normalizes question text before classification.
 *
 * The classifier should work with a predictable text representation.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  if (typeof text !== "string") {
    throw new Error("Question text must be a string");
  }

  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

module.exports = {
  normalizeText,
};
