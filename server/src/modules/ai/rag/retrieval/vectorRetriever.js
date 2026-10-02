const { createEvidence } = require("../../contracts/evidenceContract");

const INDEX_NAME = "knowledge_chunks_vector_index";
const COLLECTION_NAME = "knowledge_chunks";

const ALLOWED_CATEGORIES_BY_QUESTION = Object.freeze({
  quran: ["quran"],
  hadith: ["hadith"],
  tafsir: ["tafsir", "quran"],
  aqeedah: ["aqeedah", "quran", "hadith", "tafsir"],
  fiqh: ["fiqh", "quran", "hadith", "tafsir"],
  seerah_history: ["seerah_history", "quran", "hadith", "tafsir"],
  objections: ["objections", "general_islam", "quran", "hadith", "tafsir", "aqeedah"],
  terminology: ["terminology", "general_islam"],
  translation: ["translation", "terminology"],
});
const SUPPORTED_QUESTION_CATEGORIES = new Set([
  ...Object.keys(ALLOWED_CATEGORIES_BY_QUESTION),
  "general_islam",
  "other",
]);

function createVectorRetriever({
  db,
  embeddingProvider,
  topK = 5,
}) {
  if (!db || typeof db.collection !== "function") {
    throw new Error("MongoDB database instance is required");
  }

  if (!embeddingProvider || typeof embeddingProvider.embed !== "function") {
    throw new Error("Embedding provider is required");
  }

  const collection = db.collection(COLLECTION_NAME);

  async function retrieve(question, {
    category,
    sourceLanguages,
  } = {}) {
    if (!question || typeof question !== "string") {
      throw new Error("Question is required");
    }

    if (
      category !== undefined &&
      !SUPPORTED_QUESTION_CATEGORIES.has(category)
    ) {
      throw new Error(`Unsupported retrieval category: ${category}`);
    }

    if (
      sourceLanguages !== undefined &&
      (!Array.isArray(sourceLanguages) ||
        sourceLanguages.length === 0 ||
        sourceLanguages.some((language) =>
          typeof language !== "string" || language.trim() === ""
        ))
    ) {
      throw new Error("sourceLanguages must be a non-empty array of language codes");
    }

    const filter = {
      "metadata.approved": { $eq: true },
    };
    const allowedCategories = ALLOWED_CATEGORIES_BY_QUESTION[category];
    if (allowedCategories) {
      filter["metadata.category"] = { $in: allowedCategories };
    }
    if (sourceLanguages) {
      filter["metadata.language"] = {
        $in: sourceLanguages.map((language) => language.trim().toLowerCase()),
      };
    }

    const queryVector = await embeddingProvider.embed(question, {
      inputType: "query",
    });

    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: INDEX_NAME,
            path: "embedding",
            queryVector,
            filter,
            numCandidates: Math.max(topK * 10, 50),
            limit: topK,
          },
        },
        {
          $project: {
            _id: 0,
            chunkId: 1,
            sourceId: 1,
            text: 1,
            metadata: 1,
            model: 1,
            dimensions: 1,
            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ])
      .toArray();

    return results.map((item) =>
      createEvidence({
        sourceId: item.sourceId,
        chunkId: item.chunkId,
        text: item.text,
        score: item.score,
        citation: {
          ...item.metadata,
          sourceId: item.sourceId,
          chunkId: item.chunkId,
        },
      })
    );
  }

  return {
    retrieve,
  };
}

module.exports = {
  createVectorRetriever,
  INDEX_NAME,
  COLLECTION_NAME,
  ALLOWED_CATEGORIES_BY_QUESTION,
};
