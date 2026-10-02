const { validateSource } = require("./sourceValidator");
const { chunkText } = require("./textChunker");
const { createChunk } = require("./chunkContract");

/**
 * Ingests an approved Islamic source.
 *
 * Current responsibility:
 * 1. Validate the source.
 * 2. Normalize and split its text into chunks.
 * 3. Create traceable chunk objects.
 *
 * Storage will be added later.
 *
 * @param {Object} input
 * @param {Object} input.source
 * @param {string} input.text
 * @param {Object} [input.chunkOptions]
 * @returns {Object}
 */
function ingestSource({
  source,
  text,
  chunkOptions = {},
}) {
  const validatedSource = validateSource(source);

  if (!text || typeof text !== "string") {
    throw new Error("Source text is required");
  }

  const texts = chunkText(text, chunkOptions);

  const chunks = texts.map((chunkTextValue, index) =>
    createChunk({
      chunkId: `${validatedSource.sourceId}-chunk-${String(
        index + 1
      ).padStart(4, "0")}`,
      sourceId: validatedSource.sourceId,
      text: chunkTextValue,
      metadata: {
        sourceTitle: validatedSource.title,
        sourceType: validatedSource.type,
        language: validatedSource.language,
        reference: validatedSource.reference,
        chunkIndex: index,
      },
    })
  );

  return {
    source: validatedSource,
    chunks,
  };
}

module.exports = {
  ingestSource,
};