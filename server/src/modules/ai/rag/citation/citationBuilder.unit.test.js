const assert = require("assert");

const {
  buildCitation,
  buildCitations,
} = require("./citationBuilder");

async function main() {
  const evidence = {
    sourceId: "quranpedia-quran-hafs",
    chunkId: "quran-hafs-1-1",
    text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    score: 0.9,
    citation: {
      sourceId: "quranpedia-quran-hafs",
      chunkId: "quran-hafs-1-1",
      sourceTitle: "القرآن الكريم - حفص عن عاصم",
      reference: "الفاتحة، الآية 1",
    },
  };

  const citation = buildCitation(evidence);
  assert.strictEqual(citation.sourceId, "quranpedia-quran-hafs");
  assert.strictEqual(citation.chunkId, "quran-hafs-1-1");
  assert.strictEqual(citation.sourceTitle, "القرآن الكريم - حفص عن عاصم");
  assert.strictEqual(citation.reference, "الفاتحة، الآية 1");

  // sourceTitle / reference fall back to null when absent
  const noTitle = buildCitation({
    ...evidence,
    citation: { sourceId: "x", chunkId: "y" },
  });
  assert.strictEqual(noTitle.sourceTitle, null);
  assert.strictEqual(noTitle.reference, null);

  // buildCitations maps every evidence item
  const many = buildCitations([
    evidence,
    { ...evidence, chunkId: "quran-hafs-2-255" },
  ]);
  assert.strictEqual(many.length, 2);
  assert.strictEqual(many[1].chunkId, "quran-hafs-2-255");
  assert.strictEqual(many[1].sourceTitle, "القرآن الكريم - حفص عن عاصم");

  // validation
  assert.throws(() => buildCitation({}), /Evidence sourceId is required/);
  assert.throws(() => buildCitations({}), /Evidence must be an array/);

  console.log("citationBuilder unit test: PASSED");
}

main().catch((error) => {
  console.error("citationBuilder unit test: FAILED");
  console.error(error);
  process.exit(1);
});
