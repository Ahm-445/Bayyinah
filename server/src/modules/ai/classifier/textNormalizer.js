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
    .replace(/\s+/g, " ");
}

module.exports = {
  normalizeText,
};