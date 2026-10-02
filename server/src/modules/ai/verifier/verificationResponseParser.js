/**
 * Parses a structured verification response
 * returned by the LLM.
 *
 * Expected JSON shape:
 *
 * {
 *   "evidenceSupported": true,
 *   "unsupportedClaims": [],
 *   "warnings": [],
 *   "riskFlags": []
 * }
 *
 * @param {string} response
 * @returns {Object}
 */
function parseVerificationResponse(response) {
  if (!response || typeof response !== "string") {
    throw new Error(
      "Verification response is required"
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(response);
  } catch (error) {
    throw new Error(
      "Verification response must be valid JSON"
    );
  }

  if (
    typeof parsed.evidenceSupported !== "boolean"
  ) {
    throw new Error(
      "evidenceSupported must be a boolean"
    );
  }

  const unsupportedClaims =
    parsed.unsupportedClaims ?? [];

  const warnings =
    parsed.warnings ?? [];

  const riskFlags =
    parsed.riskFlags ?? [];

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

  return {
    evidenceSupported: parsed.evidenceSupported,
    unsupportedClaims,
    warnings,
    riskFlags,
  };
}

module.exports = {
  parseVerificationResponse,
};