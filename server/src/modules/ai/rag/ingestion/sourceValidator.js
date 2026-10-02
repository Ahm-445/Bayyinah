const { createSource } = require("./sourceContract");

/**
 * Validates and normalizes an Islamic source
 * before it enters the ingestion pipeline.
 *
 * The source must be explicitly approved.
 *
 * @param {Object} source
 * @returns {Object}
 */
function validateSource(source) {
  return createSource(source);
}

module.exports = {
  validateSource,
};