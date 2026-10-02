const SOURCE_ID = "quranpedia-tafsir-book-1";

const SOURCE_TITLE = "تيسير التفسير";

const AUTHOR_NAME = "إبراهيم القطان";

const SOURCE_VERSION = "2026-08-10";

const SOURCE_URL = "https://quranpedia.net/";

function buildTafsirChunk(ayah) {
  if (!ayah || typeof ayah !== "object") {
    throw new Error("Tafsir ayah is required");
  }

  if (!Number.isInteger(ayah.surahNumber)) {
    throw new Error("Invalid surahNumber");
  }

  if (!Number.isInteger(ayah.ayahNumber)) {
    throw new Error("Invalid ayahNumber");
  }

  if (
    !ayah.text ||
    typeof ayah.text !== "string"
  ) {
    throw new Error("Tafsir text is required");
  }

  const chunkId =
    `tafsir-book-1-${ayah.surahNumber}-${ayah.ayahNumber}`;

  return {
    chunkId,

    sourceId: SOURCE_ID,

    // Keep the original tafsir text unchanged.
    text: ayah.text,

    metadata: {
      category: "tafsir",

      sourceType: "tafsir",

      source: SOURCE_URL,

      title: SOURCE_TITLE,

      author: AUTHOR_NAME,

      language: "ar",

      surahNumber: ayah.surahNumber,

      ayahNumber: ayah.ayahNumber,

      reference:
        `${SOURCE_TITLE}، سورة ${ayah.surahNumber}، الآية ${ayah.ayahNumber}`,

      bookId: 1,

      sourceVersion: SOURCE_VERSION,

      /*
       * Keep this false until the source is explicitly
       * approved for the project's scientific knowledge base.
       */
      approved: true,
    },
  };
}

function buildTafsirChunks(ayahs) {
  if (!Array.isArray(ayahs)) {
    throw new Error("Ayahs must be an array");
  }

  return ayahs.map(buildTafsirChunk);
}

module.exports = {
  SOURCE_ID,
  SOURCE_TITLE,
  AUTHOR_NAME,
  SOURCE_VERSION,
  buildTafsirChunk,
  buildTafsirChunks,
};