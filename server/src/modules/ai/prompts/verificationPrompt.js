/**
 * Builds the prompt used to verify whether a generated
 * draft is supported by the retrieved evidence.
 *
 * The verifier must return ONLY valid JSON.
 *
 * @param {Object} input
 * @param {string} input.question
 * @param {string} input.draft
 * @param {Object[]} input.evidence
 * @returns {string}
 */
function buildVerificationPrompt({
  question,
  draft,
  evidence,
}) {
  if (!question || typeof question !== "string") {
    throw new Error("Question is required");
  }

  if (!draft || typeof draft !== "string") {
    throw new Error("Draft is required");
  }

  if (!Array.isArray(evidence)) {
    throw new Error("Evidence must be an array");
  }

  if (evidence.length === 0) {
    throw new Error(
      "At least one evidence item is required"
    );
  }

  const evidenceText = evidence
    .map((item, index) => {
      return [
        `Evidence ${index + 1}:`,
        `Source ID: ${item.sourceId}`,
        `Chunk ID: ${item.chunkId}`,
        `Text: ${item.text}`,
        `Reference: ${
          item.citation?.reference || "Not provided"
        }`,
      ].join("\n");
    })
    .join("\n\n");

  return `
You are a verification assistant for the Bayyinah platform.

Your task is to verify whether the generated draft is
supported by the retrieved evidence.

IMPORTANT RULES:

1. Use only the provided evidence for verification.
2. Do not introduce outside knowledge.
3. Do not rewrite or improve the draft.
4. Identify claims that are not supported by the evidence.
5. Do not assume that a citation proves a claim merely
   because the citation exists.
6. If the evidence is insufficient, mark the unsupported
   claim rather than filling the gap from your own knowledge.
7. Do not independently judge whether an Islamic position
   is correct. Verify only whether the provided evidence
   supports what the draft says.
8. Return ONLY valid JSON.
9. Do not use Markdown code fences.
10. Do not include any text before or after the JSON.

The JSON must have exactly this structure:

{
  "evidenceSupported": true,
  "unsupportedClaims": [],
  "warnings": [],
  "riskFlags": []
}

If one or more claims are not supported:

{
  "evidenceSupported": false,
  "unsupportedClaims": [
    "description of unsupported claim"
  ],
  "warnings": [],
  "riskFlags": []
}

Question:
${question}

Generated draft:
${draft}

Retrieved evidence:

${evidenceText}

Return the JSON verification result now.
`.trim();
}

module.exports = {
  buildVerificationPrompt,
};