const assert = require("assert");
const { buildCitation, buildInlineReferences } = require("./citationBuilder");
const { formatEvidence } = require("../../prompts/evidenceFormatter");

const evidence = {
  sourceId: "approved-hadith-source",
  chunkId: "collection-book-123",
  text: "Hadith evidence text.",
  score: 0.9,
  citation: {
    title: "Verified Collection",
    url: "https://example.org/source",
    sourceType: "hadith",
    language: "ar",
    version: "edition-2",
    license: "Licensed source",
    collection: "Collection name",
    hadithNumber: "123",
    grade: "sahih",
    gradingSource: "Qualified reference",
    reference: "Book 1, hadith 123",
  },
};

const citation = buildCitation(evidence);
assert.strictEqual(citation.sourceTitle, "Verified Collection");
assert.strictEqual(citation.sourceUrl, "https://example.org/source");
assert.strictEqual(citation.version, "edition-2");
assert.strictEqual(citation.hadithCollection, "Collection name");
assert.strictEqual(citation.hadithNumber, "123");
assert.strictEqual(citation.hadithGrade, "sahih");
assert.strictEqual(citation.gradingSource, "Qualified reference");

const promptEvidence = formatEvidence([evidence]);
for (const expected of [
  "Verified Collection",
  "Collection name",
  "Hadith number: 123",
  "Hadith grade: sahih",
  "Qualified reference",
]) {
  assert.ok(promptEvidence.includes(expected), `Missing ${expected} from evidence prompt`);
}

assert.deepStrictEqual(buildInlineReferences([{
  ...evidence,
  citation: { sourceType: "quran", surahName: "سورة الإخلاص", surahNumber: 112, ayahNumber: 1 },
}], "ar"), ["(الإخلاص 112:1)"]);
assert.deepStrictEqual(buildInlineReferences([{
  ...evidence,
  citation: { sourceType: "quran", surahNumber: 112, ayahNumber: 1 },
}], "en"), ["(Al-Ikhlas 112:1)"]);
assert.deepStrictEqual(buildInlineReferences([evidence], "en"), ["(Verified Collection, Book 1, hadith 123)"]);

console.log("Citation provenance tests: PASSED");
