const { evidenceId, organizeEvidenceForVerification } = require("./evidenceOrganizer");
const { extractDraftSpans } = require("./draftSpanExtractor");

/**
 * Parses internal claim-level model output and normalizes it to the existing
 * application verification shape.
 *
 * @param {string} response
 * @param {{draft: string, evidence: Object[]}} context
 * @returns {Object}
 */
function parseVerificationResponse(response, { question, draft, evidence = [] } = {}) {
  if (typeof response !== "string" || !response.trim()) {
    throw new Error("Verification response is required");
  }
  if (typeof draft !== "string") throw new Error("Draft is required to validate extracted claims");
  if (!Array.isArray(evidence)) throw new Error("Evidence must be an array");

  let parsed;
  try {
    parsed = JSON.parse(response);
  } catch (_error) {
    throw new Error("Verification response must be valid JSON");
  }
  if (!Array.isArray(parsed.claims)) throw new Error("claims must be an array");
  if (!Array.isArray(parsed.warnings ?? [])) throw new Error("warnings must be an array");
  if (!Array.isArray(parsed.riskFlags ?? [])) throw new Error("riskFlags must be an array");

  const spans = extractDraftSpans(draft);
  const evidenceOrder = organizeEvidenceForVerification(question || "", evidence);
  const orderedEvidence = evidenceOrder.target && evidenceOrder.focusedEvidence.length
    ? [...evidenceOrder.focusedEvidence, ...evidenceOrder.otherEvidence]
    : evidence;
  const evidenceIds = orderedEvidence.map(evidenceId);
  const warnings = [...(parsed.warnings ?? [])];
  const unsupportedClaims = [];
  const claimAudits = [];
  const claimsBySpan = new Map();
  let invalidExtraction = false;
  let everyClaimSupported = true;

  for (const claimResult of parsed.claims) {
    if (
      !claimResult || typeof claimResult !== "object" ||
      !Number.isInteger(claimResult.draftSpan) ||
      typeof claimResult.factual !== "boolean" ||
      typeof claimResult.supported !== "boolean" ||
      !Array.isArray(claimResult.supportingEvidence) ||
      claimResult.supportingEvidence.some((id) => !Number.isInteger(id)) ||
      typeof claimResult.reason !== "string"
    ) {
      throw new Error("Each claim must contain draftSpan, factual, supportingEvidence, supported, and reason fields");
    }

    if (claimResult.draftSpan < 1 || claimResult.draftSpan > spans.length || claimsBySpan.has(claimResult.draftSpan)) {
      invalidExtraction = true;
      everyClaimSupported = false;
      warnings.push("Verifier returned an invalid or duplicate draft-span reference; manual review is required.");
      continue;
    }
    claimsBySpan.set(claimResult.draftSpan, claimResult);
  }

  if (claimsBySpan.size !== spans.length) {
    invalidExtraction = true;
    everyClaimSupported = false;
    warnings.push("Verifier did not classify every draft span; manual review is required.");
  }

  for (const [index, claimResult] of [...claimsBySpan.entries()].sort(([a], [b]) => a - b)) {
    const claim = spans[index - 1];
    if (!claimResult.factual) {
      claimAudits.push({ draftClaim: claim, factual: false, supportingEvidence: [], supported: true, reason: "" });
      continue;
    }

    const referencesAreKnown = claimResult.supportingEvidence.every((number) => number >= 1 && number <= evidenceIds.length);
    const supportingEvidence = referencesAreKnown
      ? [...new Set(claimResult.supportingEvidence)].map((number) => evidenceIds[number - 1])
      : [];
    const supported = claimResult.supported && referencesAreKnown && supportingEvidence.length > 0;
    claimAudits.push({
      draftClaim: claim,
      factual: true,
      supportingEvidence,
      supported,
      reason: claimResult.reason.trim(),
    });
    if (!supported) {
      everyClaimSupported = false;
      const reason = claimResult.reason.trim() ||
        (claimResult.supported && !referencesAreKnown
          ? "The verifier selected an evidence number that was not supplied for this answer."
          : claimResult.supported
            ? "No supporting evidence was identified for this claim."
            : "The supplied evidence does not support this claim.");
      unsupportedClaims.push(`Draft claim: "${claim}" — ${reason}`);
    }
  }

  if (invalidExtraction) everyClaimSupported = false;

  return {
    evidenceSupported: everyClaimSupported,
    unsupportedClaims,
    warnings,
    riskFlags: parsed.riskFlags ?? [],
    claimAudits,
  };
}

module.exports = {
  parseVerificationResponse,
};
