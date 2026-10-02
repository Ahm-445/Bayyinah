const SOURCE_ID = "quranpedia-quran-hafs";
const SOURCE_TITLE = "القرآن الكريم - حفص عن عاصم";
const SOURCE_VERSION = "2026-09-30";
const SOURCE_URL = "https://quranpedia.net/";

function buildQuranChunk(ayah) {
  if (!ayah || typeof ayah !== "object") {
    throw new Error("Ayah is required");
  }

  if (!Number.isInteger(ayah.surahNumber)) {
    throw new Error("Invalid surahNumber");
  }

  if (!Number.isInteger(ayah.ayahNumber)) {
    throw new Error("Invalid ayahNumber");
  }

  if (!ayah.text || typeof ayah.text !== "string") {
    throw new Error("Ayah text is required");
  }

  const chunkId = `quran-hafs-${ayah.surahNumber}-${ayah.ayahNumber}`;

  return {
    chunkId,
    sourceId: SOURCE_ID,
    text: ayah.text,

    metadata: {
      category: "quran",
      sourceType: "quran",
      source: SOURCE_URL,
      title: SOURCE_TITLE,

      language: "ar",

      surahNumber: ayah.surahNumber,
      surahName: ayah.surahName,
      ayahNumber: ayah.ayahNumber,

      reference: `${ayah.surahName}، الآية ${ayah.ayahNumber}`,

      pageNumber: ayah.pageNumber,
      juz: ayah.juz,
      hizb: ayah.hizb,
      ruku: ayah.ruku,
      manzil: ayah.manzil,

      mushaf: "حفص عن عاصم",
      approved: true,
      sourceVersion: SOURCE_VERSION,
    },
  };
}

function buildQuranChunks(ayahs) {
  if (!Array.isArray(ayahs)) {
    throw new Error("Ayahs must be an array");
  }

  return ayahs.map(buildQuranChunk);
}

module.exports = {
  SOURCE_ID,
  SOURCE_TITLE,
  SOURCE_VERSION,
  buildQuranChunk,
  buildQuranChunks,
};