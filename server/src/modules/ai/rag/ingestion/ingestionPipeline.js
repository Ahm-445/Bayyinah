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
  metadataForChunk,
}) {
  const validatedSource = validateSource(source);

  if (
    metadataForChunk !== undefined &&
    typeof metadataForChunk !== "function"
  ) {
    throw new Error("metadataForChunk must be a function");
  }

  if (!text || typeof text !== "string") {
    throw new Error("Source text is required");
  }

  const texts = chunkText(text, chunkOptions);

  const chunks = texts.map((chunkTextValue, index) => {
    const chunkMetadata = metadataForChunk?.(chunkTextValue, index) || {};
    if (
      !chunkMetadata ||
      typeof chunkMetadata !== "object" ||
      Array.isArray(chunkMetadata)
    ) {
      throw new Error("metadataForChunk must return an object");
    }

    return createChunk({
      chunkId: `${validatedSource.sourceId}-chunk-${String(
        index + 1
      ).padStart(4, "0")}`,
      sourceId: validatedSource.sourceId,
      text: chunkTextValue,
      metadata: {
        ...validatedSource.metadata,
        category: validatedSource.type,
        sourceTitle: validatedSource.title,
        sourceType: validatedSource.type,
        language: validatedSource.language,
        url: validatedSource.url,
        version: validatedSource.version,
        license: validatedSource.license,
        usageBasis: validatedSource.usageBasis,
        approved: validatedSource.approved,
        reference: validatedSource.reference,
        chunkIndex: index,
        ...chunkMetadata,
        category: validatedSource.type,
        sourceTitle: validatedSource.title,
        sourceType: validatedSource.type,
        language: validatedSource.language,
        url: validatedSource.url,
        version: validatedSource.version,
        license: validatedSource.license,
        usageBasis: validatedSource.usageBasis,
        approved: validatedSource.approved,
      },
    });
  });

  return {
    source: validatedSource,
    chunks,
  };
}

module.exports = {
  ingestSource,
};
