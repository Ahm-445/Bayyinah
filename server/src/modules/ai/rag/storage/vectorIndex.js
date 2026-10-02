const INDEX_NAME = "knowledge_chunks_vector_index";

function getIndexFields() {
  return [
    {
      type: "vector",
      path: "embedding",
      numDimensions: 1024,
      similarity: "cosine",
    },
    {
      type: "filter",
      path: "metadata.approved",
    },
    {
      type: "filter",
      path: "metadata.category",
    },
    {
      type: "filter",
      path: "metadata.language",
    },
  ];
}

function normalizeFields(fields) {
  return JSON.stringify(
    fields
      .map((field) => ({
        type: field.type,
        path: field.path,
        ...(field.numDimensions === undefined
          ? {}
          : { numDimensions: field.numDimensions }),
        ...(field.similarity === undefined
          ? {}
          : { similarity: field.similarity }),
      }))
      .sort((left, right) => left.path.localeCompare(right.path))
  );
}

async function createVectorIndex(db) {
  if (!db || typeof db.collection !== "function") {
    throw new Error("MongoDB database instance is required");
  }

  const collection = db.collection("knowledge_chunks");

  const fields = getIndexFields();
  const definition = { fields };
  const indexes = await collection.listSearchIndexes().toArray();
  const existingIndex = indexes.find(
    (index) => index.name === INDEX_NAME
  );

  if (existingIndex) {
    const existingFields =
      existingIndex.latestDefinition?.fields ||
      existingIndex.definition?.fields ||
      [];

    if (
      normalizeFields(existingFields) !==
      normalizeFields(fields)
    ) {
      await collection.updateSearchIndex(INDEX_NAME, definition);
    }

    return INDEX_NAME;
  }

  return collection.createSearchIndex({
    name: INDEX_NAME,
    type: "vectorSearch",
    definition,
  });
}

module.exports = {
  INDEX_NAME,
  createVectorIndex,
};
