const assert = require("node:assert/strict");
const test = require("node:test");
const { citationsFromText, verseKeysOf } = require("../src/services/citations");

// Evidence shapes as stored on real drafts (see modules/ai ingestion).
const tafsir = {
  sourceId: "quranpedia-tafsir-book-1",
  chunkId: "quranpedia-tafsir-book-1-p1-pg25-a170-0123456789ab",
  text: "يبين الله تعالى هنا القاعدة الكبرى...",
  citation: { sourceType: "tafsir", reference: "Quran 2:163", references: [{ surahNumber: 2, ayahNumber: 163 }] },
};
const tafsirRange = {
  sourceId: "quranpedia-tafsir-book-1",
  chunkId: "quranpedia-tafsir-book-1-p4-pg66-a423-a424-a425-a426-abcdef012345",
  text: "...",
  citation: { category: "tafsir", reference: "Quran 3:130–3:133" },
};
const translation = {
  sourceId: "quran-translation-1947",
  chunkId: "quran-translation-1947-112-1",
  text: "Say, \"He is Allah, [who is] One,\"",
  citation: { sourceType: "translation", surahNumber: 112, ayahNumber: 1 },
};
const hadith = {
  sourceId: "ahmedbaset-hadith-muslim",
  chunkId: "ahmedbaset-hadith-muslim-38",
  text: "...",
  citation: { sourceType: "hadith", sourceTitle: "Sahih Muslim", reference: "Sahih Muslim 38" },
};

test("a tafsir chunk is cited when the answer names one of its verses", () => {
  const text = "التوحيد إفراد الله بالعبادة (البقرة 2:163). قل هو الله أحد (الإخلاص 112:1). (Sahih Muslim 38)";
  assert.deepEqual(
    citationsFromText(text, [tafsir, translation, hadith]).map((c) => c.chunkId),
    [tafsir.chunkId, translation.chunkId, hadith.chunkId]
  );
});

test("a verse inside a tafsir range counts; nearby numbers do not", () => {
  assert.deepEqual(verseKeysOf(tafsirRange), ["3:130", "3:131", "3:132", "3:133"]);
  assert.equal(citationsFromText("(آل عمران 3:131)", [tafsirRange]).length, 1);
  for (const text of ["(البقرة 2:164)", "(النحل 12:163)", "2:1630", "no reference"]) {
    assert.deepEqual(citationsFromText(text, [tafsir]), [], text);
  }
});

test("older chunk ids still resolve their verse", () => {
  assert.deepEqual(verseKeysOf({ chunkId: "quran-hafs-51-56", citation: {} }), ["51:56"]);
  assert.deepEqual(verseKeysOf({ chunkId: "tafsir-book-1-1-2", citation: {} }), ["1:2"]);
  assert.deepEqual(verseKeysOf(hadith), []);
});
