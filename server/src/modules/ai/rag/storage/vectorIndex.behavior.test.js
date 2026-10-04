const assert = require("assert");
const { createVectorIndex, INDEX_NAME } = require("./vectorIndex");

const expectedFields = [
  {
    type: "vector",
    path: "embedding",
    numDimensions: 1024,
    similarity: "cosine",
  },
  { type: "filter", path: "metadata.approved" },
  { type: "filter", path: "metadata.category" },
  { type: "filter", path: "metadata.language" },
  { type: "filter", path: "metadata.languages" },
];

function createDb(existingIndexes = []) {
  const calls = { create: [], update: [] };
  const collection = {
    listSearchIndexes() {
      return { async toArray() { return existingIndexes; } };
    },
    async createSearchIndex(definition) {
      calls.create.push(definition);
      return definition.name;
    },
    async updateSearchIndex(name, definition) {
      calls.update.push({ name, definition });
    },
  };

  return {
    calls,
    db: { collection: () => collection },
  };
}

async function main() {
  const missing = createDb();
  assert.strictEqual(await createVectorIndex(missing.db), INDEX_NAME);
  assert.strictEqual(missing.calls.create.length, 1);
  assert.deepStrictEqual(missing.calls.create[0].definition.fields, expectedFields);

  const current = createDb([
    { name: INDEX_NAME, latestDefinition: { fields: expectedFields } },
  ]);
  assert.strictEqual(await createVectorIndex(current.db), INDEX_NAME);
  assert.strictEqual(current.calls.create.length, 0);
  assert.strictEqual(current.calls.update.length, 0);

  const outdated = createDb([
    {
      name: INDEX_NAME,
      latestDefinition: {
        fields: [expectedFields[0]],
      },
    },
  ]);
  assert.strictEqual(await createVectorIndex(outdated.db), INDEX_NAME);
  assert.strictEqual(outdated.calls.update.length, 1);
  assert.strictEqual(outdated.calls.update[0].name, INDEX_NAME);
  assert.deepStrictEqual(outdated.calls.update[0].definition.fields, expectedFields);

  console.log("Vector index create/update tests: PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
