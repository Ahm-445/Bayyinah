const {
  createVerificationResult,
} = require("../contracts/verificationContract");

const {
  determineVerificationStatus,
} = require("./verificationRules");

/**
 * Verifies that every citation in the generated draft
 * corresponds to retrieved evidence.
 *
 * Important:
 * This verifies citation traceability only.
 * It does NOT verify whether the answer's claims
 * are semantically supported by the cited evidence.
 *
 * @param {Object} draft
 * @param {Object[]} evidence
 * @returns {Object}
 */
function verifyCitations(draft, evidence) {
  if (!draft || typeof draft !== "object") {
    throw new Error("Draft is required");
  }

  if (!Array.isArray(draft.citations)) {
    throw new Error("Draft citations must be an array");
  }

  if (!Array.isArray(evidence)) {
    throw new Error("Evidence must be an array");
  }

  const evidenceKeys = new Set(
    evidence.map(
      (item) => `${item.sourceId}:${item.chunkId}`
    )
  );

  const missingCitations = [];

  for (const citation of draft.citations) {
    if (
      !citation ||
      typeof citation !== "object" ||
      !citation.sourceId ||
      !citation.chunkId
    ) {
      missingCitations.push("Invalid citation");
      continue;
    }

    const key = `${citation.sourceId}:${citation.chunkId}`;

    if (!evidenceKeys.has(key)) {
      missingCitations.push(
        `${citation.sourceId}:${citation.chunkId}`
      );
    }
  }

  const citationValid =
    missingCitations.length === 0;

  const status = determineVerificationStatus({
    citationValid,
    evidenceSupported: true,
    missingCitations,
  });

  return createVerificationResult({
    status,
    citationValid,
    evidenceSupported: true,
    missingCitations,
  });
}

module.exports = {
  verifyCitations,
};