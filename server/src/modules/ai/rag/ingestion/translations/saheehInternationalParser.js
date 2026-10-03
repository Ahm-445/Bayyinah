const fs = require("fs");

const EXPECTED_TRANSLATION_ID = 1947;
const EXPECTED_LOCALE = "en";
const EXPECTED_AYAH_COUNT = 6236;

function decodeHtmlEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const isHex = code[1]?.toLowerCase() === "x";
      const number = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
    }
    return namedEntities[code.toLowerCase()] ?? entity;
  });
}

function htmlToText(value) {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitTranslationAndNotes(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Translated ayah text is required");
  }

  const normalized = htmlToText(rawText);
  const divider = /(?:^|\n)\s*_{5,}\s*(?:\n|$)/m.exec(normalized);
  const translationText = divider
    ? normalized.slice(0, divider.index).trim()
    : normalized;
  const translatorNotes = divider
    ? normalized.slice(divider.index + divider[0].length).trim()
    : "";

  if (!translationText) {
    throw new Error("Translated ayah text is empty after removing markup");
  }

  return { translationText, translatorNotes };
}

function parseTranslationData(data, {
  expectedTranslationId = EXPECTED_TRANSLATION_ID,
  expectedLocale = EXPECTED_LOCALE,
  expectedAyahCount = EXPECTED_AYAH_COUNT,
} = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Translation document must be an object");
  }
  if (Number(data.id) !== expectedTranslationId) {
    throw new Error(`Expected translation id ${expectedTranslationId}, got ${data.id}`);
  }
  if (typeof data.locale_code !== "string" || data.locale_code.toLowerCase() !== expectedLocale) {
    throw new Error(`Expected translation locale ${expectedLocale}, got ${data.locale_code}`);
  }
  if (!Array.isArray(data.ayahs)) {
    throw new Error("Translation document ayahs must be an array");
  }
  if (data.ayahs.length !== expectedAyahCount) {
    throw new Error(`Expected ${expectedAyahCount} ayahs, got ${data.ayahs.length}`);
  }

  const seen = new Set();
  const ayahs = data.ayahs.map((ayah, index) => {
    const surahNumber = Number(ayah?.surah_number);
    const ayahNumber = Number(ayah?.ayah_number);
    const pageNumber = Number(ayah?.page_number);
    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      throw new Error(`Invalid surah number at translation row ${index + 1}`);
    }
    if (!Number.isInteger(ayahNumber) || ayahNumber < 1) {
      throw new Error(`Invalid ayah number at translation row ${index + 1}`);
    }
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
      throw new Error(`Invalid page number at translation row ${index + 1}`);
    }

    const key = `${surahNumber}:${ayahNumber}`;
    if (seen.has(key)) throw new Error(`Duplicate translated ayah ${key}`);
    seen.add(key);

    const { translationText, translatorNotes } = splitTranslationAndNotes(ayah.translated_text);
    return { surahNumber, ayahNumber, pageNumber, translationText, translatorNotes };
  });

  return {
    translation: {
      id: Number(data.id),
      localeCode: data.locale_code.toLowerCase(),
      language: data.language,
      direction: data.direction,
      name: data.name,
      shortName: data.short_name,
      description: data.description,
    },
    ayahs,
  };
}

function parseTranslationFile(filePath, options) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Translation JSON path is required");
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read translation JSON: ${error.message}`);
  }
  return parseTranslationData(data, options);
}

module.exports = {
  EXPECTED_TRANSLATION_ID,
  EXPECTED_LOCALE,
  EXPECTED_AYAH_COUNT,
  htmlToText,
  splitTranslationAndNotes,
  parseTranslationData,
  parseTranslationFile,
};
