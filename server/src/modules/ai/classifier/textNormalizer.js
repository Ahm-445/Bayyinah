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

/**
 * Whether normalized text contains a classifier indicator (substring match).
 *
 * An Arabic indicator does not match when it is immediately followed by a
 * taa marbuta: the ruling word "حكم" must not match inside "الحكمة" (wisdom),
 * and "حديث" (hadith) must not match "حديثة" (modern). Inflections without
 * it, such as "حديثًا" or "الحكم", still match.
 *
 * @param {string} normalizedText output of normalizeText()
 * @param {string} indicator
 * @returns {boolean}
 */
function containsIndicator(normalizedText, indicator) {
  const needle = String(indicator).toLowerCase();

  if (!/[ء-ي]/.test(needle)) {
    return normalizedText.includes(needle);
  }

  let from = 0;

  for (;;) {
    const index = normalizedText.indexOf(needle, from);

    if (index === -1) return false;
    if (normalizedText[index + needle.length] !== "ة") return true;

    from = index + 1;
  }
}

module.exports = {
  normalizeText,
  containsIndicator,
};
