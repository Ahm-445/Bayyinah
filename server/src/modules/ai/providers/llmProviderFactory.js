const { createOpenAILLMProvider } = require("./openaiLLMProvider");
const { createGeminiLLMProvider } = require("./geminiLLMProvider");

function createConfiguredLLMProvider({ provider = process.env.LLM_PROVIDER || "openai", ...options } = {}) {
  switch (provider.toLowerCase()) {
    case "openai":
      return createOpenAILLMProvider(options);
    case "gemini":
      return createGeminiLLMProvider(options);
    default:
      throw new Error(`Unsupported LLM_PROVIDER "${provider}". Choose "openai" or "gemini".`);
  }
}

module.exports = { createConfiguredLLMProvider };
