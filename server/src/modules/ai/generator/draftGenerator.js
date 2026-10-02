const {
  createLLMProvider,
} = require("../providers/llmProvider");

const {
  buildGenerationPrompt,
} = require("../prompts/generationPrompt");

const {
  createDraft,
} = require("../contracts/draftContract");

const { buildCitations } = require("../rag/citation/citationBuilder");

/**
 * Creates a draft generator.
 *
 * The generator is responsible only for producing
 * an AI draft from a question and retrieved evidence.
 *
 * It does not publish the answer.
 *
 * @param {Object} config
 * @param {Object} config.llmProvider
 * @param {string} [config.model]
 * @returns {Object}
 */
function createDraftGenerator({
  llmProvider,
  model = "default",
}) {
  const llm = createLLMProvider(llmProvider);

  /**
   * Generates a draft answer.
   *
   * @param {Object} input
   * @param {string} input.question
   * @param {string} input.language
   * @param {Object[]} input.evidence
   * @returns {Promise<Object>}
   */
  async function generateDraft({
    question,
    language,
    evidence,
  }) {
    const prompt = buildGenerationPrompt({
      question,
      language,
      evidence,
    });

    const answer = await llm.generate(prompt, {
      model,
      temperature: 0.2,
    });

    const citations = buildCitations(evidence);

    return createDraft({
      answer,
      language,
      citations,
    });
  }

  return {
    generateDraft,
  };
}

module.exports = {
  createDraftGenerator,
};
