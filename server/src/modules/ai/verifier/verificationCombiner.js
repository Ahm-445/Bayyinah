const { createVerificationResult } = require("../contracts/verificationContract");
const { determineVerificationStatus } = require("./verificationRules");

function combineVerificationResults({
  citationVerification,
  evidenceVerification,
}) {
  if (!citationVerification || typeof citationVerification !== "object") {
    throw new Error("Citation verification is required");
  }

  if (!evidenceVerification || typeof evidenceVerification !== "object") {
    throw new Error("Evidence verification is required");
  }

  const citationValid = citationVerification.citationValid === true;
  const evidenceSupported = evidenceVerification.evidenceSupported === true;

  const unsupportedClaims = [
    ...(citationVerification.unsupportedClaims || []),
    ...(evidenceVerification.unsupportedClaims || []),
  ];

  const missingCitations = [
    ...(citationVerification.missingCitations || []),
    ...(evidenceVerification.missingCitations || []),
  ];

  const riskFlags = [
    ...(citationVerification.riskFlags || []),
    ...(evidenceVerification.riskFlags || []),
  ];

  const warnings = [
    ...(citationVerification.warnings || []),
    ...(evidenceVerification.warnings || []),
  ];

  const status = determineVerificationStatus({
    citationValid,
    evidenceSupported,
    unsupportedClaims,
    missingCitations,
    riskFlags,
    warnings,
  });

  return createVerificationResult({
    status,
    citationValid,
    evidenceSupported,
    unsupportedClaims,
    missingCitations,
    riskFlags,
    warnings,
  });
}

module.exports = {
  combineVerificationResults,
};
