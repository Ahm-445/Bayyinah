const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { htmlToText, parseTafsirData, parseTafsirFile } = require("./tafsirParser");

const base = {
  license: { version: "2026-08-10", en: "Free in-app use." },
  book: { id: 1, name: "تيسير التفسير", author: { full_name: "إبراهيم القطان" }, language: { code: "ar" } },
  ayahs: [
    { surah: 1, ayah: 1, content: [{ text: "<strong>حمد</strong><br>لله &amp; رسوله", part: "1", page: 1, ayahs: "1,2" }] },
    { surah: 1, ayah: 2, content: [{ text: "<strong>حمد</strong><br>لله &amp; رسوله", part: "1", page: 1, ayahs: "1,2" }] },
  ],
};

test("tafsir parser strips markup and deduplicates repeated blocks", () => {
  assert.equal(htmlToText("<b>بسم</b><br>الله &amp; الرحمن"), "بسم\nالله & الرحمن");
  const parsed = parseTafsirData(base, { expectedAyahCount: 2 });
  assert.equal(parsed.ayahRows, 2);
  assert.equal(parsed.blocks.length, 1);
  assert.deepEqual(parsed.blocks[0].references, [{ surahNumber: 1, ayahNumber: 1 }, { surahNumber: 1, ayahNumber: 2 }]);
  assert.equal(parsed.blocks[0].text, "حمد\nلله & رسوله");
});

test("tafsir parser rejects unknown global ayah references", () => {
  const invalid = structuredClone(base);
  invalid.ayahs[0].content[0].ayahs = "1,3";
  assert.throws(() => parseTafsirData(invalid, { expectedAyahCount: 2 }), /global ayah references/);
});

test("tafsir parser numbers global ayahs in mushaf order when rows are string-sorted", () => {
  // Same row order as the Quranpedia dump (surah 1, 10, then 2). Mushaf order: 1:1=1, 1:2=2, 2:1=3, 10:1=4.
  const stringSorted = structuredClone(base);
  stringSorted.ayahs = [
    { surah: 1, ayah: 1, content: [{ text: "الفاتحة ١", part: "1", page: 1, ayahs: "1" }] },
    { surah: 1, ayah: 2, content: [{ text: "الفاتحة ٢", part: "1", page: 1, ayahs: "2" }] },
    { surah: 10, ayah: 1, content: [{ text: "يونس", part: "2", page: 179, ayahs: "4" }] },
    { surah: 2, ayah: 1, content: [{ text: "البقرة", part: "1", page: 3, ayahs: "3" }] },
  ];
  const parsed = parseTafsirData(stringSorted, { expectedAyahCount: 4 });
  const referencesByText = Object.fromEntries(parsed.blocks.map((block) => [block.text, block.references]));
  assert.deepEqual(referencesByText["البقرة"], [{ surahNumber: 2, ayahNumber: 1 }]);
  assert.deepEqual(referencesByText["يونس"], [{ surahNumber: 10, ayahNumber: 1 }]);
});

test("actual Quranpedia tafsir dump validates and yields deduplicated chunks", () => {
  const filePath = path.resolve(__dirname, "../../../../../../data/tafsir/tafsir-book-1.json.gz");
  const parsed = parseTafsirFile(filePath);
  assert.equal(parsed.ayahRows, 6236);
  assert.equal(parsed.blocks.length, 1460);
  assert.equal(parsed.license.version, "2026-08-10");

  // Global ayah 170 is 2:163 ("وإلهكم إله واحد"), not 107:3; 1365 is 10:1, not 2:284.
  const referenceOf = (globalAyah) => {
    const block = parsed.blocks.find((candidate) => candidate.globalAyahNumbers.includes(globalAyah));
    return block.references[block.globalAyahNumbers.indexOf(globalAyah)];
  };
  assert.deepEqual(referenceOf(170), { surahNumber: 2, ayahNumber: 163 });
  assert.deepEqual(referenceOf(1365), { surahNumber: 10, ayahNumber: 1 });
});
