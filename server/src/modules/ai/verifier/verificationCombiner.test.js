const {
  combineVerificationResults,
} = require("./verificationCombiner");

function main() {
  const citationVerification = {
    status: "PASS",
    citationValid: true,
    evidenceSupported: true,
    unsupportedClaims: [],
    missingCitations: [],
    riskFlags: [],
    warnings: ["Citation format should be reviewed."],
  };

  const evidenceVerification = {
    status: "PASS",
    citationValid: true,
    evidenceSupported: true,
    unsupportedClaims: [],
    missingCitations: [],
    riskFlags: [],
    warnings: [],
  };

  const result = combineVerificationResults({
    citationVerification,
    evidenceVerification,
  });

  console.log("\nCOMBINED RESULT:\n");
  console.dir(result, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Citation valid:",
    result.citationValid === true ? "✅" : "❌"
  );

  console.log(
    "Evidence supported:",
    result.evidenceSupported === true ? "✅" : "❌"
  );

  console.log(
    "Warning preserved:",
    result.warnings.length === 1 ? "✅" : "❌"
  );

  console.log(
    "Status NEEDS_REVIEW:",
    result.status === "NEEDS_REVIEW" ? "✅" : "❌"
  );
}

try {
  main();
} catch (error) {
  console.error("\n❌ TEST FAILED\n");
  console.error(error);
  process.exit(1);
}
