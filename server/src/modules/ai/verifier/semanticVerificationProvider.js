const {
  createLLMProvider,
} = require("../providers/llmProvider");

const {
  buildVerificationPrompt,
} = require("../prompts/verificationPrompt");

const {
  VERIFICATION_RESPONSE_FORMAT,
} = require("../providers/openaiLLMProvider");

/**
 * Creates a semantic verification provider.
 *
 * The provider uses an LLM to determine whether the
 * generated draft is supported by the retrieved evidence.
 *
 * Important:
 * This provider does not rewrite the draft.
 * It only returns the model's verification response.
 *
 * @param {Object} config
 * @param {Object} config.llmProvider
 * @param {string} [config.model="default"]
 * @returns {Object}
 */
function createSemanticVerificationProvider({
  llmProvider,
  model = "default",
}) {
  const llm = createLLMProvider(llmProvider);

  /**
   * Verifies a generated draft against retrieved evidence.
   *
   * @param {Object} input
   * @param {string} input.question
   * @param {string} input.draft
   * @param {Object[]} input.evidence
   * @returns {Promise<string>}
   */
  async function verify({
    question,
    draft,
    evidence,
  }) {
    const prompt = buildVerificationPrompt({
      question,
      draft,
      evidence,
    });

    return llm.generate(prompt, {
      model,
      temperature: 0,
      maxOutputTokens: 700,
      taskType: "evidence_verification",
      responseFormat: VERIFICATION_RESPONSE_FORMAT,
    });
  }

  return {
    verify,
  };
}

module.exports = {
  createSemanticVerificationProvider,
};
