const assert = require("assert");
const path = require("path");

const {
  parseQuranpediaDump,
  extractHafsAyahs,
} = require("./quranParser");

const dumpPath = path.join(
  __dirname,
  "../../../../../../data/quran/mushafs-1.json.gz"
);

console.log("Reading:", dumpPath);

const dump = parseQuranpediaDump(dumpPath);

assert.ok(dump);
assert.ok(dump.license);
assert.ok(dump.data);

const ayahs = extractHafsAyahs(dump);

console.log("Surahs:", dump.data.surahs.length);
console.log("Ayahs:", ayahs.length);

assert.strictEqual(
  dump.data.surahs.length,
  114,
  "Quran must contain 114 surahs"
);

assert.strictEqual(
  ayahs.length,
  6236,
  "Hafs Quran must contain 6236 ayahs"
);

assert.strictEqual(ayahs[0].surahNumber, 1);
assert.strictEqual(ayahs[0].ayahNumber, 1);

assert.ok(
  typeof ayahs[0].text === "string" &&
    ayahs[0].text.length > 0,
  "First ayah must contain text"
);

const lastAyah = ayahs[ayahs.length - 1];

assert.strictEqual(lastAyah.surahNumber, 114);
assert.ok(lastAyah.ayahNumber > 0);

console.log("First ayah:", ayahs[0]);
console.log("Last ayah:", lastAyah);

console.log("Quran parser test: PASSED");