const fs = require("fs");
const zlib = require("zlib");

const EXPECTED_AYAH_COUNT = 6236;

function decodeHtmlEntities(value) {
  const namedEntities = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const point = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
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

function parseTafsirData(data, { expectedAyahCount = EXPECTED_AYAH_COUNT } = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Tafsir document must be an object");
  if (!data.license || typeof data.license !== "object" || !data.license.version || !data.license.en) {
    throw new Error("Tafsir document is missing license usage terms or version");
  }
  if (!data.book || Number(data.book.id) !== 1 || !data.book.name || !data.book.author?.full_name) {
    throw new Error("Expected Quranpedia tafsir book 1 metadata");
  }
  if (data.book.language?.code !== "ar") throw new Error(`Expected Arabic tafsir, got ${data.book.language?.code}`);
  if (!Array.isArray(data.ayahs) || data.ayahs.length !== expectedAyahCount) {
    throw new Error(`Expected ${expectedAyahCount} ayah rows, got ${data.ayahs?.length ?? 0}`);
  }

  const globalReferences = new Map();
  const rowsSeen = new Set();
  data.ayahs.forEach((row, index) => {
    const surahNumber = Number(row?.surah);
    const ayahNumber = Number(row?.ayah);
    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114 || !Number.isInteger(ayahNumber) || ayahNumber < 1) {
      throw new Error(`Invalid Quran reference at tafsir row ${index + 1}`);
    }
    const key = `${surahNumber}:${ayahNumber}`;
    if (rowsSeen.has(key)) throw new Error(`Duplicate tafsir ayah row ${key}`);
    rowsSeen.add(key);
    globalReferences.set(index + 1, { surahNumber, ayahNumber });
    if (!Array.isArray(row.content)) throw new Error(`Tafsir content must be an array at ${key}`);
  });

  const blocks = new Map();
  for (const [rowIndex, row] of data.ayahs.entries()) {
    for (const block of row.content) {
      if (!block || typeof block.text !== "string" || !block.text.trim()) throw new Error(`Empty tafsir block at ${row.surah}:${row.ayah}`);
      const part = Number(block.part);
      const pageNumber = Number(block.page);
      if (!Number.isInteger(part) || part < 1 || !Number.isInteger(pageNumber) || pageNumber < 1) {
        throw new Error(`Invalid tafsir part/page at ${row.surah}:${row.ayah}`);
      }
      const globalAyahNumbers = String(block.ayahs ?? "").split(",").map((value) => Number(value.trim()));
      if (!globalAyahNumbers.length || globalAyahNumbers.some((number) => !Number.isInteger(number) || !globalReferences.has(number))) {
        throw new Error(`Invalid global ayah references in tafsir block at ${row.surah}:${row.ayah}`);
      }
      const references = globalAyahNumbers.map((number) => globalReferences.get(number));
      const text = htmlToText(block.text);
      if (!text) throw new Error(`Tafsir block contains no readable text at ${row.surah}:${row.ayah}`);
      const key = JSON.stringify([part, pageNumber, globalAyahNumbers, text]);
      if (!blocks.has(key)) {
        blocks.set(key, {
          part,
          pageNumber,
          globalAyahNumbers,
          references,
          text,
        });
      }
    }
  }

  return {
    license: data.license,
    book: data.book,
    ayahRows: data.ayahs.length,
    blocks: [...blocks.values()],
  };
}

function parseTafsirFile(filePath, options) {
  if (!filePath || typeof filePath !== "string") throw new Error("Tafsir dump path is required");
  let data;
  try {
    data = JSON.parse(zlib.gunzipSync(fs.readFileSync(filePath)).toString("utf8"));
  } catch (error) {
    throw new Error(`Could not read Quranpedia tafsir gzip JSON: ${error.message}`);
  }
  return parseTafsirData(data, options);
}

module.exports = { EXPECTED_AYAH_COUNT, htmlToText, parseTafsirData, parseTafsirFile };
