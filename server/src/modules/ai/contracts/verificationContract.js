const { VERIFICATION_STATUS } = require("./aiTypes");

/**
 * Creates a normalized verification result.
 *
 * Verification checks whether the generated draft is:
 * - supported by the retrieved evidence
 * - correctly cited
 * - free from known unsupported claims
 *
 * Important:
 * PASS does not mean the AI answer is automatically approved.
 * The Da'i still reviews the draft before publication.
 *
 * @param {Object} input
 * @param {string} input.status
 * @param {boolean} input.citationValid
 * @param {boolean} input.evidenceSupported
 * @param {string[]} [input.unsupportedClaims]
 * @param {string[]} [input.missingCitations]
 * @param {string[]} [input.riskFlags]
 * @param {string[]} [input.warnings]
 * @returns {Object}
 */
function createVerificationResult({
  status,
  citationValid,
  evidenceSupported,
  unsupportedClaims = [],
  missingCitations = [],
  riskFlags = [],
  warnings = [],
}) {
  if (!Object.values(VERIFICATION_STATUS).includes(status)) {
    throw new Error(`Invalid verification status: ${status}`);
  }

  if (typeof citationValid !== "boolean") {
    throw new Error("citationValid must be a boolean");
  }

  if (typeof evidenceSupported !== "boolean") {
    throw new Error("evidenceSupported must be a boolean");
  }

  if (!Array.isArray(unsupportedClaims)) {
    throw new Error("unsupportedClaims must be an array");
  }

  if (!Array.isArray(missingCitations)) {
    throw new Error("missingCitations must be an array");
  }

  if (!Array.isArray(riskFlags)) {
    throw new Error("riskFlags must be an array");
  }

  if (!Array.isArray(warnings)) {
    throw new Error("warnings must be an array");
  }

  return {
    status,
    citationValid,
    evidenceSupported,
    unsupportedClaims,
    missingCitations,
    riskFlags,
    warnings,
  };
}

module.exports = {
  createVerificationResult,
};