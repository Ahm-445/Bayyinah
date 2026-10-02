/**
 * Determines whether retrieved evidence is sufficient
 * to continue to answer generation.
 *
 * Important:
 * Retrieval relevance is not scholarly correctness.
 * This check only determines whether enough relevant
 * evidence was retrieved for the next pipeline step.
 *
 * @param {Object[]} evidence
 * @param {Object} [options]
 * @param {number} [options.minimumEvidence=1]
 * @param {number} [options.minimumScore=0.7]
 * @returns {Object}
 */
function checkEvidenceSufficiency(
  evidence,
  {
    minimumEvidence = 1,
    minimumScore = 0.7,
  } = {}
) {
  if (!Array.isArray(evidence)) {
    throw new Error("Evidence must be an array");
  }

  if (
    !Number.isInteger(minimumEvidence) ||
    minimumEvidence <= 0
  ) {
    throw new Error(
      "minimumEvidence must be a positive integer"
    );
  }

  if (
    typeof minimumScore !== "number" ||
    Number.isNaN(minimumScore) ||
    minimumScore < 0 ||
    minimumScore > 1
  ) {
    throw new Error(
      "minimumScore must be a number between 0 and 1"
    );
  }

  const qualifyingEvidence = evidence.filter(
    (item) =>
      typeof item.score === "number" &&
      item.score >= minimumScore
  );

  const sufficient =
    qualifyingEvidence.length >= minimumEvidence;

  return {
    sufficient,
    evidenceCount: evidence.length,
    qualifyingEvidenceCount: qualifyingEvidence.length,
    minimumEvidence,
    minimumScore,
  };
}

module.exports = {
  checkEvidenceSufficiency,
};