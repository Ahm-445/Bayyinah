const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { parseHadithBookData, parseHadithBookFile, parseHadithFiles } = require("./hadithParser");

function fixture(bookId, hadiths, chapters = [{ id: 0, bookId, arabic: "المقدمة", english: "Introduction" }]) {
  return { id: bookId, metadata: { id: bookId }, chapters, hadiths };
}

test("parser preserves Bukhari/Muslim bilingual fields and Muslim introduction chapter zero", () => {
  const muslim = parseHadithBookData(fixture(2, [{ id: 1, idInBook: 1, chapterId: 0, bookId: 2, arabic: "حديث عربي", english: { narrator: "Narrator", text: "English text" } }]), "muslim", { expectedHadiths: 1 });
  assert.equal(muslim.hadiths[0].chapter.id, 0);
  assert.deepEqual(muslim.hadiths[0].languages, ["ar", "en"]);
  assert.equal(muslim.hadiths[0].english.text, "English text");
});

test("parser accepts a missing English translation while requiring Arabic text", () => {
  const bukhari = parseHadithBookData(fixture(1, [{ id: 1, idInBook: 1, chapterId: 0, bookId: 1, arabic: "حديث", english: { narrator: "Narrator", text: "" } }]), "bukhari", { expectedHadiths: 1 });
  assert.equal(bukhari.missingEnglishText, 1);
  assert.deepEqual(bukhari.hadiths[0].languages, ["ar"]);
  assert.throws(() => parseHadithBookData(fixture(1, [{ id: 1, idInBook: 1, chapterId: 0, bookId: 1, arabic: "", english: { narrator: "", text: "English" } }]), "bukhari", { expectedHadiths: 1 }), /Arabic hadith text is required/);
});

test("file parser validates Bukhari and Muslim dumps without machine-specific paths", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bayyinah-hadith-parser-"));
  const bukhariFile = path.join(directory, "bukhari.json");
  const muslimFile = path.join(directory, "muslim.json");
  const bukhari = fixture(1, [{ id: 1, idInBook: 1, chapterId: 0, bookId: 1, arabic: "حديث البخاري", english: { narrator: "Narrator", text: "Bukhari text" } }]);
  const muslim = fixture(2, [{ id: 1, idInBook: 1, chapterId: 0, bookId: 2, arabic: "حديث مسلم", english: { narrator: "Narrator", text: "Muslim text" } }]);

  try {
    fs.writeFileSync(bukhariFile, JSON.stringify(bukhari));
    fs.writeFileSync(muslimFile, JSON.stringify(muslim));
    const parsed = parseHadithFiles({ bukhariFile, muslimFile, expectedHadithCounts: { bukhari: 1, muslim: 1 } });
    assert.equal(parsed.hadithCount, 2);
    assert.equal(parsed.books[0].hadiths[0].chapter.id, 0);
    assert.equal(parsed.books[1].hadiths[0].chapter.id, 0);
    assert.equal(parsed.books[0].hadiths[0].english.text, "Bukhari text");
    assert.equal(parsed.books[1].hadiths[0].english.text, "Muslim text");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
