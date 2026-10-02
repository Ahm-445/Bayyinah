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

  async function requestEmbeddings(texts, inputType) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error("Texts are required");
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
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
      data.data.length !== texts.length
    ) {
      throw new Error("Invalid Voyage embedding response");
    }

    return data.data.map((item) => {
      if (!item || !Array.isArray(item.embedding)) {
        throw new Error("Invalid Voyage embedding item");
      }

      if (item.embedding.length !== dimensions) {
        throw new Error(
          `Invalid embedding dimensions: expected ${dimensions}, got ${item.embedding.length}`
        );
      }

      return item.embedding;
    });
  }

  return {
    async embed(text, { inputType = "query" } = {}) {
      if (!text || typeof text !== "string") {
        throw new Error("Text is required");
      }

      if (!["query", "document"].includes(inputType)) {
        throw new Error("inputType must be query or document");
      }

      const [embedding] = await requestEmbeddings(
        [text],
        inputType
      );

      return embedding;
    },

    async embedBatch(
      texts,
      { inputType = "document" } = {}
    ) {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error("Texts are required");
      }

      if (!["query", "document"].includes(inputType)) {
        throw new Error("inputType must be query or document");
      }

      return requestEmbeddings(texts, inputType);
    },
  };
}

module.exports = {
  createVoyageEmbeddingProvider,
  MODEL,
  DIMENSIONS,
};