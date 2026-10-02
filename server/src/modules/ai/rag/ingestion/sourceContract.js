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
 * @param {string} input.url
 * @param {string} input.version
 * @param {string} [input.license]
 * @param {string} [input.usageBasis]
 * @param {boolean} input.approved
 * @returns {Object}
 */
function createSource({
  sourceId,
  title,
  type,
  language,
  reference,
  url,
  version,
  license,
  usageBasis,
  metadata = {},
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

  if (!url || typeof url !== "string") {
    throw new Error("Source URL is required");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Source URL must be a valid HTTP or HTTPS URL");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Source URL must be a valid HTTP or HTTPS URL");
  }

  if (!version || typeof version !== "string" || !version.trim()) {
    throw new Error("Source version is required");
  }

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("Source metadata must be an object");
  }

  if (license !== undefined && license !== null && typeof license !== "string") {
    throw new Error("Source license must be a string");
  }

  if (
    usageBasis !== undefined &&
    usageBasis !== null &&
    typeof usageBasis !== "string"
  ) {
    throw new Error("Source usage basis must be a string");
  }

  const normalizedLicense = license?.trim() || null;
  const normalizedUsageBasis = usageBasis?.trim() || null;
  if (!normalizedLicense && !normalizedUsageBasis) {
    throw new Error("Source license or usage basis is required");
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
    url: parsedUrl.toString(),
    version: version.trim(),
    license: normalizedLicense,
    usageBasis: normalizedUsageBasis,
    metadata,
    approved,
  };
}

module.exports = {
  createSource,
};
