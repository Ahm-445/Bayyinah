const MODEL = "voyage-4-large";
const DIMENSIONS = 1024;
const API_URL = "https://ai.mongodb.com/v1/embeddings";

function createVoyageEmbeddingProvider({
  apiKey = process.env.VOYAGE_API_KEY,
  model = MODEL,
  dimensions = DIMENSIONS,
} = {}) {
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is required");
  }

  return {
    async embed(text, { inputType = "query" } = {}) {
      if (!text || typeof text !== "string") {
        throw new Error("Text is required");
      }

      if (!["query", "document"].includes(inputType)) {
        throw new Error("inputType must be query or document");
      }

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: [text],
          model,
          input_type: inputType,
          output_dimension: dimensions,
          output_dtype: "float",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Voyage API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      if (
        !data.data ||
        !Array.isArray(data.data) ||
        !data.data[0] ||
        !Array.isArray(data.data[0].embedding)
      ) {
        throw new Error("Invalid Voyage embedding response");
      }

      return data.data[0].embedding;
    },
  };
}

module.exports = {
  createVoyageEmbeddingProvider,
  MODEL,
  DIMENSIONS,
};
