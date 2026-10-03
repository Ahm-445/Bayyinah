const {
  createEvidenceVerification,
} = require("./evidenceVerifier");

const {
  parseVerificationResponse,
} = require("./verificationResponseParser");

/**
 * Creates the complete semantic evidence verifier.
 *
 * This service:
 * 1. Sends the draft and evidence to the semantic verifier.
 * 2. Parses the structured LLM response.
 * 3. Determines the final verification status.
 *
 * @param {Object} semanticVerificationProvider
 * @returns {Object}
 */
function createEvidenceVerifierService(
  semanticVerificationProvider,
  { onClaimAudit } = {}
) {
  if (
    !semanticVerificationProvider ||
    typeof semanticVerificationProvider.verify !==
      "function"
  ) {
    throw new Error(
      "Semantic verification provider must implement verify()"
    );
  }

  /**
   * Verifies a generated draft against evidence.
   *
   * @param {Object} input
   * @param {string} input.question
   * @param {Object} input.draft
   * @param {Object[]} input.evidence
   * @returns {Promise<Object>}
   */
  async function verify({
    question,
    draft,
    evidence,
  }) {
    if (!draft || typeof draft !== "object") {
      throw new Error("Draft is required");
    }

    const response =
      await semanticVerificationProvider.verify({
        question,
        draft: draft.answer,
        evidence,
      });

    const parsed = parseVerificationResponse(response, {
      question,
      draft: draft.answer,
      evidence,
    });

    if (typeof onClaimAudit === "function") {
      onClaimAudit(parsed.claimAudits);
    }

    return createEvidenceVerification({
      evidenceSupported:
        parsed.evidenceSupported,
      unsupportedClaims:
        parsed.unsupportedClaims,
      warnings: parsed.warnings,
      riskFlags: parsed.riskFlags,
    });
  }

  return {
    verify,
  };
}

module.exports = {
  createEvidenceVerifierService,
};
