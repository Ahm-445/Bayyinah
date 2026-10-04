const assert = require("node:assert/strict");
const test = require("node:test");
const {
  parseTranslationData,
  splitTranslationAndNotes,
} = require("./saheehInternationalParser");

test("parses English translation rows and retains separate footnotes", () => {
  const text = "(1) In Allāh &amp; mercy.<br />\n____________________<br /><span>[2]-</span> Explanatory note.";
  const parsed = splitTranslationAndNotes(text);
  assert.equal(parsed.translationText, "(1) In Allāh & mercy.");
  assert.equal(parsed.translatorNotes, "[2]- Explanatory note.");

  const result = parseTranslationData({
    id: 1947,
    language: "English",
    locale_code: "en",
    direction: "ltr",
    name: "Saheeh International English translation",
    short_name: "Saheeh International",
    description: "Test source",
    ayahs: [
      { surah_number: 1, ayah_number: 1, page_number: 1, translated_text: text },
      { surah_number: 1, ayah_number: 2, page_number: 1, translated_text: "Praise be to Allāh." },
    ],
  }, { expectedAyahCount: 2 });

  assert.equal(result.translation.localeCode, "en");
  assert.equal(result.ayahs[0].translatorNotes, "[2]- Explanatory note.");
  assert.equal(result.ayahs[1].translatorNotes, "");
});

test("rejects non-English files, duplicate verse references, and wrong counts", () => {
  const base = {
    id: 1947,
    language: "English",
    locale_code: "en",
    ayahs: [
      { surah_number: 1, ayah_number: 1, page_number: 1, translated_text: "Text" },
    ],
  };
  assert.throws(() => parseTranslationData({ ...base, locale_code: "zh" }, { expectedAyahCount: 1 }), /Expected translation locale/);
  assert.throws(() => parseTranslationData(base), /Expected 6236 ayahs/);
  assert.throws(() => parseTranslationData({ ...base, ayahs: [base.ayahs[0], base.ayahs[0]] }, { expectedAyahCount: 2 }), /Duplicate translated ayah/);
});
