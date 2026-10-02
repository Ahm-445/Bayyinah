const { GoogleGenAI } = require("@google/genai");

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

function createGeminiLLMProvider({
  apiKey = process.env.GEMINI_API_KEY,
  model = DEFAULT_MODEL,
} = {}) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  return {
    async generate(prompt, options = {}) {
      if (!prompt || typeof prompt !== "string") {
        throw new Error("Prompt is required");
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: options.temperature ?? 0.2,
        },
      });

      const text = response.text;

      if (typeof text !== "string" || !text.trim()) {
        throw new Error("Gemini returned an empty response");
      }

      return text.trim();
    },
  };
}

module.exports = {
  createGeminiLLMProvider,
  DEFAULT_MODEL,
};