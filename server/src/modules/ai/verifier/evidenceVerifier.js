const {
  createVerificationResult,
} = require("../contracts/verificationContract");
const { determineVerificationStatus } = require("./verificationRules");

/**
 * Creates a normalized evidence verification result.
 *
 * This first version expects the verification decision
 * to be supplied by a verification provider.
 *
 * Later, the provider can use an LLM or another
 * semantic verification mechanism.
 *
 * @param {Object} input
 * @param {boolean} input.evidenceSupported
 * @param {string[]} [input.unsupportedClaims]
 * @param {string[]} [input.warnings]
 * @param {string[]} [input.riskFlags]
 * @returns {Object}
 */
function createEvidenceVerification({
  evidenceSupported,
  unsupportedClaims = [],
  warnings = [],
  riskFlags = [],
}) {
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

  if (!Array.isArray(warnings)) {
    throw new Error(
      "warnings must be an array"
    );
  }

  if (!Array.isArray(riskFlags)) {
    throw new Error(
      "riskFlags must be an array"
    );
  }

  return createVerificationResult({
    // FAIL when unsupported, NEEDS_REVIEW when only warnings or risk flags remain.
    status: determineVerificationStatus({
      citationValid: true,
      evidenceSupported,
      unsupportedClaims,
      warnings,
      riskFlags,
    }),
    citationValid: true,
    evidenceSupported,
    unsupportedClaims,
    warnings,
    riskFlags,
  });
}

module.exports = {
  createEvidenceVerification,
};