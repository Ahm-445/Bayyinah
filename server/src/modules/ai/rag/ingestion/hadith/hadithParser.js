const fs = require("fs");

const BOOKS = Object.freeze({
  bukhari: { bookId: 1, slug: "bukhari", title: "Sahih al-Bukhari", arabicTitle: "صحيح البخاري", expectedHadiths: 7277 },
  muslim: { bookId: 2, slug: "muslim", title: "Sahih Muslim", arabicTitle: "صحيح مسلم", expectedHadiths: 7459 },
});

function normalizeText(value) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[\t ]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim()
    : "";
}

function parseHadithBookData(data, bookKey, { expectedHadiths = BOOKS[bookKey]?.expectedHadiths } = {}) {
  const book = BOOKS[bookKey];
  if (!book) throw new Error(`Unsupported hadith book: ${bookKey}`);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(`${book.title} JSON must be an object`);
  if (Number(data.id) !== book.bookId || Number(data.metadata?.id) !== book.bookId) {
    throw new Error(`Expected ${book.title} bookId ${book.bookId}, got ${data.id}`);
  }
  if (!Array.isArray(data.chapters) || !Array.isArray(data.hadiths)) throw new Error(`${book.title} must contain chapters and hadiths arrays`);
  if (expectedHadiths !== undefined && data.hadiths.length !== expectedHadiths) {
    throw new Error(`Expected ${expectedHadiths} ${bookKey} hadiths, got ${data.hadiths.length}`);
  }

  const chapters = new Map();
  for (const [index, chapter] of data.chapters.entries()) {
    if (!Number.isInteger(chapter?.id) || chapter.id < 0 || Number(chapter.bookId) !== book.bookId) {
      throw new Error(`Invalid ${bookKey} chapter at row ${index + 1}`);
    }
    if (chapters.has(chapter.id)) throw new Error(`Duplicate ${bookKey} chapter id ${chapter.id}`);
    if (typeof chapter.arabic !== "string" || typeof chapter.english !== "string") {
      throw new Error(`Chapter ${chapter.id} must have Arabic and English titles`);
    }
    chapters.set(chapter.id, { id: chapter.id, bookId: book.bookId, arabic: normalizeText(chapter.arabic), english: normalizeText(chapter.english) });
  }

  const ids = new Set();
  const idsInBook = new Set();
  let missingEnglishText = 0;
  const hadiths = data.hadiths.map((hadith, index) => {
    if (!Number.isInteger(hadith?.id) || !Number.isInteger(hadith?.idInBook) || !Number.isInteger(hadith?.chapterId) || Number(hadith?.bookId) !== book.bookId) {
      throw new Error(`Invalid ${bookKey} hadith identifiers at row ${index + 1}`);
    }
    if (ids.has(hadith.id) || idsInBook.has(hadith.idInBook)) throw new Error(`Duplicate ${bookKey} hadith id at row ${index + 1}`);
    if (!chapters.has(hadith.chapterId)) throw new Error(`Missing ${bookKey} chapter ${hadith.chapterId} for hadith ${hadith.idInBook}`);
    if (typeof hadith.arabic !== "string" || !hadith.arabic.trim()) throw new Error(`Arabic hadith text is required for ${bookKey} ${hadith.idInBook}`);
    if (typeof hadith.english?.narrator !== "string" || typeof hadith.english?.text !== "string") {
      throw new Error(`English narrator and text fields must be strings for ${bookKey} ${hadith.idInBook}`);
    }
    ids.add(hadith.id);
    idsInBook.add(hadith.idInBook);
    const englishNarrator = normalizeText(hadith.english.narrator);
    const englishText = normalizeText(hadith.english.text);
    if (!englishText) missingEnglishText++;
    return {
      id: hadith.id,
      idInBook: hadith.idInBook,
      chapterId: hadith.chapterId,
      bookId: book.bookId,
      arabic: normalizeText(hadith.arabic),
      english: { narrator: englishNarrator, text: englishText },
      chapter: chapters.get(hadith.chapterId),
      languages: englishText ? ["ar", "en"] : ["ar"],
    };
  });

  return {
    book: { ...book, metadata: data.metadata },
    chapters: [...chapters.values()],
    hadiths,
    missingEnglishText,
  };
}

function parseHadithBookFile(filePath, bookKey, options) {
  if (!filePath || typeof filePath !== "string") throw new Error(`${bookKey} JSON path is required`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${bookKey} JSON: ${error.message}`);
  }
  return parseHadithBookData(data, bookKey, options);
}

function parseHadithFiles({ bukhariFile, muslimFile, expectedHadithCounts = {} }) {
  const bukhari = parseHadithBookFile(bukhariFile, "bukhari", { expectedHadiths: expectedHadithCounts.bukhari ?? BOOKS.bukhari.expectedHadiths });
  const muslim = parseHadithBookFile(muslimFile, "muslim", { expectedHadiths: expectedHadithCounts.muslim ?? BOOKS.muslim.expectedHadiths });
  return { books: [bukhari, muslim], hadithCount: bukhari.hadiths.length + muslim.hadiths.length };
}

module.exports = { BOOKS, normalizeText, parseHadithBookData, parseHadithBookFile, parseHadithFiles };
