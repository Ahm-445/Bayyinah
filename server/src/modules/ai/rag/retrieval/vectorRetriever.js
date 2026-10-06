const { createEvidence } = require("../../contracts/evidenceContract");
const { hadithGradeOf } = require("../citation/citationBuilder");

const INDEX_NAME = "knowledge_chunks_vector_index";
const COLLECTION_NAME = "knowledge_chunks";

const ALLOWED_CATEGORIES_BY_QUESTION = Object.freeze({
  quran: ["quran", "translation"],
  hadith: ["hadith"],
  tafsir: ["tafsir", "quran", "translation"],
  aqeedah: ["aqeedah", "quran", "translation", "hadith", "tafsir"],
  fiqh: ["fiqh", "quran", "translation", "hadith", "tafsir"],
  seerah_history: ["seerah_history", "quran", "translation", "hadith", "tafsir"],
  objections: ["objections", "general_islam", "quran", "translation", "hadith", "tafsir", "aqeedah"],
  terminology: ["terminology", "general_islam"],
  translation: ["translation", "terminology", "quran"],
});
const SUPPORTED_QUESTION_CATEGORIES = new Set([
  ...Object.keys(ALLOWED_CATEGORIES_BY_QUESTION),
  "general_islam",
  "other",
]);
const REQUIRED_SOURCE_CATEGORIES = Object.freeze({
  quran: ["quran", "translation"],
  hadith: ["hadith"],
  tafsir: ["tafsir"],
  translation: ["translation"],
});

function createVectorRetriever({
  db,
  embeddingProvider,
  topK = 5,
  // Optional { inactiveSourceIds(): Promise<string[]> } (see sourceRegistry.js).
  sourceRegistry,
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
    requiredSourceTypes,
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

    if (requiredSourceTypes !== undefined && (
      !Array.isArray(requiredSourceTypes) ||
      requiredSourceTypes.length === 0 ||
      requiredSourceTypes.some((type) => !REQUIRED_SOURCE_CATEGORIES[type])
    )) {
      throw new Error("requiredSourceTypes must contain supported source types");
    }

    function makeFilter(allowedCategories) {
      const filter = { "metadata.approved": { $eq: true } };
      if (allowedCategories) filter["metadata.category"] = { $in: allowedCategories };
      if (sourceLanguages) {
        const normalizedLanguages = sourceLanguages.map((language) => language.trim().toLowerCase());
        filter.$or = [
          { "metadata.language": { $in: normalizedLanguages } },
          { "metadata.languages": { $in: normalizedLanguages } },
        ];
      }
      return filter;
    }

    const allowedCategories = ALLOWED_CATEGORIES_BY_QUESTION[category];
    const baseFilter = makeFilter(allowedCategories);

    const queryVector = await embeddingProvider.embed(question, {
      inputType: "query",
    });

    // Sources switched off in the registry. sourceId is not a vector-index
    // filter field, so they are removed after the search, which therefore asks
    // for more candidates.
    const inactiveSourceIds = sourceRegistry ? await sourceRegistry.inactiveSourceIds() : [];
    const searchLimit = inactiveSourceIds.length ? topK * 4 : topK;

    function search(filter) {
      return collection.aggregate([
        {
          $vectorSearch: {
            index: INDEX_NAME,
            path: "embedding",
            queryVector,
            filter,
            numCandidates: Math.max(searchLimit * 10, 50),
            limit: searchLimit,
          },
        },
        ...(inactiveSourceIds.length
          ? [{ $match: { sourceId: { $nin: inactiveSourceIds } } }, { $limit: topK }]
          : []),
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
      ]).toArray();
    }

    let results;
    if (requiredSourceTypes?.length) {
      const partitions = await Promise.all(requiredSourceTypes.map((type) =>
        search(makeFilter(REQUIRED_SOURCE_CATEGORIES[type]))
      ));
      const unique = new Map();
      for (const item of partitions.flat()) {
        if (!unique.has(item.chunkId)) unique.set(item.chunkId, item);
      }
      results = [...unique.values()].sort((a, b) => b.score - a.score);
    } else {
      results = await search(baseFilter);
    }

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
          // Qur'an chunks name their source `title`; hadith/translation use `sourceTitle`.
          sourceTitle: item.metadata?.sourceTitle || item.metadata?.title || null,
          ...(hadithGradeOf(item.metadata) ? { hadithGrade: hadithGradeOf(item.metadata) } : {}),
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
  REQUIRED_SOURCE_CATEGORIES,
};
