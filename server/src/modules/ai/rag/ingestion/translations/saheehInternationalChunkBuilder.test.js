const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createSaheehInternationalSource,
  buildSaheehInternationalChunk,
} = require("./saheehInternationalChunkBuilder");

test("builds approved English translation chunks with precise Quran references", () => {
  const source = createSaheehInternationalSource({
    url: "https://example.org/translation",
    version: "dataset-version-1",
    usageBasis: "Approved terms recorded by the project owner",
    approved: true,
  });
  const chunk = buildSaheehInternationalChunk({
    surahNumber: 2,
    ayahNumber: 255,
    pageNumber: 42,
    translationText: "Allāh—there is no deity except Him.",
    translatorNotes: "[1]- An explanatory note.",
  }, source);

  assert.equal(chunk.sourceId, "quran-translation-1947");
  assert.equal(chunk.chunkId, "quran-translation-1947-2-255");
  assert.match(chunk.text, /Translator notes:/);
  assert.equal(chunk.metadata.category, "translation");
  assert.equal(chunk.metadata.language, "en");
  assert.equal(chunk.metadata.reference, "Quran 2:255");
  assert.equal(chunk.metadata.approved, true);
});

test("requires source license or usage basis and explicit approval", () => {
  assert.throws(() => createSaheehInternationalSource({
    url: "https://example.org/translation",
    version: "1",
    approved: true,
  }), /Source license or usage basis is required/);
  assert.throws(() => createSaheehInternationalSource({
    url: "https://example.org/translation",
    version: "1",
    usageBasis: "Terms",
    approved: false,
  }), /Source is not approved/);
});
