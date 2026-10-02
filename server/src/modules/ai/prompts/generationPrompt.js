/**
 * Builds the prompt used to generate a Bayyinah draft.
 *
 * The model must generate from the retrieved evidence only.
 * It must not invent sources, citations, or unsupported claims.
 *
 * @param {Object} input
 * @param {string} input.question
 * @param {string} input.language
 * @param {Object[]} input.evidence
 * @returns {string}
 */
function buildGenerationPrompt({
  question,
  language,
  evidence,
}) {
  if (!question || typeof question !== "string") {
    throw new Error("Question is required");
  }

  if (!language || typeof language !== "string") {
    throw new Error("Language is required");
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
You are assisting a Da'i on the Bayyinah platform.

Your task is to draft a clear and respectful answer
to the seeker's question.

IMPORTANT RULES:

1. Use only the provided evidence.
2. Do not invent facts, sources, references, or quotations.
3. Do not claim that a source says something unless the
   provided evidence supports that claim.
4. If the evidence is insufficient to answer the question,
   explicitly say that the available evidence is insufficient.
5. Do not issue a personal fatwa or make a ruling about
   an individual's personal circumstances.
6. Distinguish sourced Islamic text from your own explanatory
   wording.
7. Do not present a disputed issue as universally agreed.
8. Adapt the explanation to the seeker's language.
9. Keep the tone respectful and suitable for someone who
   may not be Muslim.
10. This is a draft for review by a Da'i. It is not a
    published or independently authoritative answer.

Question language:
${language}

Seeker question:
${question}

Retrieved evidence:

${evidenceText}

Generate a draft answer based only on the evidence above.
`.trim();
}

module.exports = {
  buildGenerationPrompt,
};