const {
  VERIFICATION_STATUS,
} = require("../contracts/aiTypes");

/**
 * Determines the final verification status from
 * citation and evidence checks.
 *
 * Rules:
 * - Invalid citations => FAIL
 * - Unsupported claims => FAIL
 * - Missing citations => FAIL
 * - Explicit risk flags => NEEDS_REVIEW
 * - Warnings => NEEDS_REVIEW
 * - Otherwise => PASS
 *
 * Important:
 * PASS only means that the automated checks passed.
 * It does not mean the Da'i should publish automatically.
 *
 * @param {Object} input
 * @param {boolean} input.citationValid
 * @param {boolean} input.evidenceSupported
 * @param {string[]} [input.unsupportedClaims]
 * @param {string[]} [input.missingCitations]
 * @param {string[]} [input.riskFlags]
 * @param {string[]} [input.warnings]
 * @returns {string}
 */
function determineVerificationStatus({
  citationValid,
  evidenceSupported,
  unsupportedClaims = [],
  missingCitations = [],
  riskFlags = [],
  warnings = [],
}) {
  if (typeof citationValid !== "boolean") {
    throw new Error("citationValid must be a boolean");
  }

  if (typeof evidenceSupported !== "boolean") {
    throw new Error(
      "evidenceSupported must be a boolean"
    );
  }

  if (!Array.isArray(unsupportedClaims)) {
    throw new Error(
      "unsupportedClaims must be an array"
    );
  }

  if (!Array.isArray(missingCitations)) {
    throw new Error(
      "missingCitations must be an array"
    );
  }

  if (!Array.isArray(riskFlags)) {
    throw new Error("riskFlags must be an array");
  }

  if (!Array.isArray(warnings)) {
    throw new Error("warnings must be an array");
  }

  if (
    !citationValid ||
    !evidenceSupported ||
    unsupportedClaims.length > 0 ||
    missingCitations.length > 0
  ) {
    return VERIFICATION_STATUS.FAIL;
  }

  if (
    riskFlags.length > 0 ||
    warnings.length > 0
  ) {
    return VERIFICATION_STATUS.NEEDS_REVIEW;
  }

  return VERIFICATION_STATUS.PASS;
}

module.exports = {
  determineVerificationStatus,
};