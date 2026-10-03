const { formatOrganizedEvidence } = require("../verifier/evidenceOrganizer");
const { extractDraftSpans } = require("../verifier/draftSpanExtractor");

/**
 * Builds the single-call, claim-level verification prompt.
 *
 * @param {Object} input
 * @param {string} input.question
 * @param {string} input.draft
 * @param {Object[]} input.evidence
 * @returns {string}
 */
function buildVerificationPrompt({ question, draft, evidence }) {
  if (!question || typeof question !== "string") throw new Error("Question is required");
  if (!draft || typeof draft !== "string") throw new Error("Draft is required");
  if (!Array.isArray(evidence)) throw new Error("Evidence must be an array");
  if (evidence.length === 0) throw new Error("At least one evidence item is required");

  const { text: evidenceText, evidenceOrder } = formatOrganizedEvidence(question, evidence);
  const spans = extractDraftSpans(draft);
  const draftSpanText = spans.map((span, index) => `D${index + 1}: ${span}`).join("\n");
  const evidenceIdText = evidenceOrder.map((item, index) =>
    `E${index + 1} = ${item.sourceId}:${item.chunkId}`
  ).join("\n");

  return `
You verify Bayyinah answers against only the evidence supplied below. This is one claim-level verification pass.

Evaluate each supplied draft span exactly once, using its D number. Do not write claim text yourself: the server maps D numbers back to exact draft text. This makes it impossible to invent a claim or omit a span silently.
1. Set factual=false only for courtesy, headings, or transitions with no factual/source attribution. A source attribution belongs with the adjacent quoted text; factual statements and quotations are factual=true.
2. For every factual span, select its supporting evidence using E numbers. One span may use multiple E numbers, and multiple evidence items may jointly support it.
3. Decide support from evidence text and source metadata only. Scores are not truth and are omitted from the evidence.
4. Mark supported=true for a direct statement, faithful paraphrase, or faithful synthesis. Normal explanatory wording does not require an exact source phrase.
5. Mark supported=false for any added fact not reasonably derived from evidence, invented Quran or hadith wording, unsupported attribution, or materially altered source meaning. Preserve the distinction "المُلك والمِلك" if present in evidence.
6. A supported factual span must cite one or more E numbers. Unsupported factual spans may cite the closest inspected evidence or an empty list. Give a brief reason only for unsupported factual spans.
7. Do not let unrelated evidence override support found in primary evidence matching the requested surah or ayah.
8. Do not judge theology or add outside knowledge.

Return only JSON matching this internal structure:
{
  "claims": [
    {"draftSpan": 1, "factual": true, "supportingEvidence": [1, 2], "supported": true, "reason": ""}
  ],
  "warnings": [],
  "riskFlags": []
}

Return one object for every supplied D span, in order, without duplicates. Keep reasons empty for factual=true and supported=true; keep other reasons short. The supplied span list is exhaustive; do not add spans.

Question:
${question}

Generated draft:
${draft}

Draft spans to evaluate:
${draftSpanText}

Evidence reference numbers (copy these E numbers into supportingEvidence):
${evidenceIdText}

Evidence text:
${evidenceText}

Verify each factual/source-dependent draft claim now.
`.trim();
}

module.exports = { buildVerificationPrompt };
