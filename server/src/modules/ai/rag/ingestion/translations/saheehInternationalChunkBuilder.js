const { createChunk } = require("../chunkContract");
const { createSource } = require("../sourceContract");

const SOURCE_ID = "quran-translation-1947";
const TRANSLATOR = "Saheeh International";
const SOURCE_TITLE = "Saheeh International English Translation of the Quran";

function createSaheehInternationalSource({
  url,
  version,
  license,
  usageBasis,
  approved,
  sourceDescription,
  sourceName,
}) {
  return createSource({
    sourceId: SOURCE_ID,
    title: SOURCE_TITLE,
    type: "translation",
    language: "en",
    reference: "Quran verse translation",
    url,
    version,
    license,
    usageBasis,
    approved,
    metadata: {
      translator: TRANSLATOR,
      translationId: 1947,
      sourceName: sourceName || null,
      sourceDescription: sourceDescription || null,
    },
  });
}

function buildSaheehInternationalChunk(ayah, source) {
  if (!ayah || typeof ayah !== "object") throw new Error("Translated ayah is required");
  if (!source || source.sourceId !== SOURCE_ID || source.approved !== true) {
    throw new Error("An approved Saheeh International source is required");
  }
  if (!Number.isInteger(ayah.surahNumber) || !Number.isInteger(ayah.ayahNumber)) {
    throw new Error("Translated ayah reference is invalid");
  }
  if (!ayah.translationText || typeof ayah.translationText !== "string") {
    throw new Error("Translated ayah text is required");
  }

  const reference = `Quran ${ayah.surahNumber}:${ayah.ayahNumber}`;
  const text = ayah.translatorNotes
    ? `Translation: ${ayah.translationText}\n\nTranslator notes:\n${ayah.translatorNotes}`
    : `Translation: ${ayah.translationText}`;

  return createChunk({
    chunkId: `${SOURCE_ID}-${ayah.surahNumber}-${ayah.ayahNumber}`,
    sourceId: SOURCE_ID,
    text,
    metadata: {
      ...source.metadata,
      category: "translation",
      sourceType: "translation",
      sourceTitle: source.title,
      translator: TRANSLATOR,
      language: source.language,
      url: source.url,
      version: source.version,
      license: source.license,
      usageBasis: source.usageBasis,
      approved: source.approved,
      reference,
      surahNumber: ayah.surahNumber,
      ayahNumber: ayah.ayahNumber,
      pageNumber: ayah.pageNumber,
      translationText: ayah.translationText,
      translatorNotes: ayah.translatorNotes || null,
    },
  });
}

module.exports = {
  SOURCE_ID,
  TRANSLATOR,
  SOURCE_TITLE,
  createSaheehInternationalSource,
  buildSaheehInternationalChunk,
};
