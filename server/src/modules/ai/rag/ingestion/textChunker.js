/**
 * Splits source text into normalized chunks.
 *
 * This is a simple deterministic chunker for the first
 * version of Bayyinah RAG.
 *
 * Important:
 * We keep the original chunk order so that the evidence
 * remains traceable to the source.
 *
 * @param {string} text
 * @param {Object} options
 * @param {number} [options.maxCharacters=1000]
 * @param {number} [options.overlapCharacters=100]
 * @returns {string[]}
 */
function chunkText(
  text,
  {
    maxCharacters = 1000,
    overlapCharacters = 100,
  } = {}
) {
  if (!text || typeof text !== "string") {
    throw new Error("Text is required");
  }

  if (
    !Number.isInteger(maxCharacters) ||
    maxCharacters <= 0
  ) {
    throw new Error(
      "maxCharacters must be a positive integer"
    );
  }

  if (
    !Number.isInteger(overlapCharacters) ||
    overlapCharacters < 0
  ) {
    throw new Error(
      "overlapCharacters must be a non-negative integer"
    );
  }

  if (overlapCharacters >= maxCharacters) {
    throw new Error(
      "overlapCharacters must be smaller than maxCharacters"
    );
  }

  const normalizedText = text
    .trim()
    .replace(/\s+/g, " ");

  if (!normalizedText) {
    return [];
  }

  const chunks = [];

  let start = 0;

  while (start < normalizedText.length) {
    const end = Math.min(
      start + maxCharacters,
      normalizedText.length
    );

    const chunk = normalizedText
      .slice(start, end)
      .trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalizedText.length) {
      break;
    }

    start = end - overlapCharacters;
  }

  return chunks;
}

module.exports = {
  chunkText,
};