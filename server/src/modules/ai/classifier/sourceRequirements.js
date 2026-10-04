const { normalizeText } = require("./textNormalizer");

function detectRequiredSourceTypes(questionText) {
  const text = normalizeText(questionText);
  const required = [];
  // normalizeText folds آ/أ/إ to ا and removes diacritics, so آية becomes اية.
  // Require explicit Quran/verse/surah wording to avoid routing ordinary
  // Arabic questions to Quran retrieval.
  if (
    /\bquran\b|\bkoran\b|القران|قران/.test(text) ||
    /(?:^|[\s،,.])(?:ايه|اية|ايات|سوره|سورة)(?=$|[\s،,.])/.test(text) ||
    /نص قراني|القران الكريم/.test(text)
  ) required.push("quran");
  if (/\bhadith\b|\bsunnah\b|حديث|السنه/.test(text)) required.push("hadith");
  if (/\btafsir\b|تفسير/.test(text)) required.push("tafsir");
  if (/\btranslation\b|\btranslate\b|ترجمه|ترجم/.test(text)) required.push("translation");
  return [...new Set(required)];
}

module.exports = { detectRequiredSourceTypes };
