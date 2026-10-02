const fs = require("fs");
const zlib = require("zlib");

function stripHtml(text) {
  if (typeof text !== "string") {
    throw new Error("Tafsir text must be a string");
  }

  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseTafsirDump(filePath) {
  if (!filePath) {
    throw new Error("Tafsir dump file path is required");
  }

  const raw = zlib
    .gunzipSync(fs.readFileSync(filePath))
    .toString("utf8");

  const dump = JSON.parse(raw);

  if (!dump.license || !dump.license.source) {
    throw new Error(
      "Invalid tafsir dump: license metadata is missing"
    );
  }

  if (!dump.book || !dump.book.id) {
    throw new Error(
      "Invalid tafsir dump: book metadata is missing"
    );
  }

  if (!Array.isArray(dump.ayahs)) {
    throw new Error(
      "Invalid tafsir dump: ayahs is missing"
    );
  }

  return dump;
}

function extractTafsirAyahs(dump) {
  const result = [];

  for (const ayah of dump.ayahs) {
    if (
      !Number.isInteger(ayah.surah) ||
      ayah.surah < 1 ||
      ayah.surah > 114
    ) {
      throw new Error(
        `Invalid surah number: ${ayah.surah}`
      );
    }

    if (
      !Number.isInteger(ayah.ayah) ||
      ayah.ayah < 1
    ) {
      throw new Error(
        `Invalid ayah number: ${ayah.ayah}`
      );
    }

    if (!Array.isArray(ayah.content)) {
      throw new Error(
        `Missing content for ${ayah.surah}:${ayah.ayah}`
      );
    }

    const text = ayah.content
      .map((item) => stripHtml(item.text))
      .filter(Boolean)
      .join("\n\n")
      .trim();

    if (!text) {
      throw new Error(
        `Empty tafsir for ${ayah.surah}:${ayah.ayah}`
      );
    }

    result.push({
      surahNumber: ayah.surah,
      ayahNumber: ayah.ayah,
      text,
    });
  }

  return result;
}

module.exports = {
  stripHtml,
  parseTafsirDump,
  extractTafsirAyahs,
};