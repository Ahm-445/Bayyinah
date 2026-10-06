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

// Hadith grade: every hadith comes from Sahih al-Bukhari / Sahih Muslim.
{
  const { hadithGradeOf } = require("./citationBuilder");
  const hadith = (extra) => ({ sourceType: "hadith", hadithCollection: "Sahih al-Bukhari", ...extra });
  assert.strictEqual(hadithGradeOf(hadith()), "صحيح");
  assert.strictEqual(hadithGradeOf({ category: "hadith", sourceTitle: "Sahih Muslim" }), "صحيح");
  assert.strictEqual(hadithGradeOf(hadith({ hadithGrade: "حسن" })), "حسن", "a stored grade wins");
  assert.strictEqual(hadithGradeOf({ sourceType: "hadith", hadithCollection: "Sunan Abi Dawud" }), null);
  assert.strictEqual(hadithGradeOf({ sourceType: "quran", sourceTitle: "Sahih Muslim" }), null);
  assert.strictEqual(buildCitation({
    sourceId: "ahmedbaset-hadith-muslim", chunkId: "ahmedbaset-hadith-muslim-38", text: "...",
    citation: { sourceType: "hadith", sourceTitle: "Sahih Muslim", reference: "Sahih Muslim 38" },
  }).hadithGrade, "صحيح");
  assert.ok(formatEvidence([{ sourceId: "s", chunkId: "c", text: "t", citation: { sourceType: "hadith", hadithGrade: "صحيح" } }])
    .includes("Hadith grade: صحيح"));
}
