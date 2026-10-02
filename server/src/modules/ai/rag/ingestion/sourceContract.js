/**
 * Creates a normalized approved-source object.
 *
 * A source represents an Islamic reference that has been
 * explicitly approved for use by the Bayyinah RAG system.
 *
 * Important:
 * The RAG system must reject sources that are not approved.
 *
 * @param {Object} input
 * @param {string} input.sourceId
 * @param {string} input.title
 * @param {string} input.type
 * @param {string} input.language
 * @param {string} input.reference
 * @param {boolean} input.approved
 * @returns {Object}
 */
function createSource({
  sourceId,
  title,
  type,
  language,
  reference,
  approved,
}) {
  if (!sourceId || typeof sourceId !== "string") {
    throw new Error("sourceId is required");
  }

  if (!title || typeof title !== "string") {
    throw new Error("Source title is required");
  }

  if (!type || typeof type !== "string") {
    throw new Error("Source type is required");
  }

  if (!language || typeof language !== "string") {
    throw new Error("Source language is required");
  }

  if (!reference || typeof reference !== "string") {
    throw new Error("Source reference is required");
  }

  if (typeof approved !== "boolean") {
    throw new Error("approved must be a boolean");
  }

  if (!approved) {
    throw new Error("Source is not approved for RAG use");
  }

  return {
    sourceId,
    title: title.trim(),
    type: type.trim(),
    language: language.toLowerCase(),
    reference: reference.trim(),
    approved,
  };
}

module.exports = {
  createSource,
};