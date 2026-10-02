/**
 * LLM Provider Contract
 *
 * The AI generation layer should not depend directly
 * on a specific LLM provider.
 *
 * A real provider must implement:
 *
 * generate(prompt, options) -> Promise<string>
 */

/**
 * Validates an LLM response.
 *
 * @param {string} response
 * @returns {string}
 */
function validateLLMResponse(response) {
  if (typeof response !== "string") {
    throw new Error("LLM response must be a string");
  }

  const normalizedResponse = response.trim();

  if (!normalizedResponse) {
    throw new Error("LLM response cannot be empty");
  }

  return normalizedResponse;
}

/**
 * Creates an LLM provider interface.
 *
 * @param {Object} provider
 * @returns {Object}
 */
function createLLMProvider(provider) {
  if (!provider || typeof provider !== "object") {
    throw new Error("LLM provider is required");
  }

  if (typeof provider.generate !== "function") {
    throw new Error(
      "LLM provider must implement generate(prompt, options)"
    );
  }

  return {
    async generate(prompt, options = {}) {
      if (!prompt || typeof prompt !== "string") {
        throw new Error("Prompt is required");
      }

      const response = await provider.generate(
        prompt,
        options
      );

      return validateLLMResponse(response);
    },
  };
}

module.exports = {
  createLLMProvider,
  validateLLMResponse,
};