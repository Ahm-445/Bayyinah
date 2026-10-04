const { createChunk } = require("../chunkContract");
const { createSource } = require("../sourceContract");
const { BOOKS } = require("./hadithParser");

const DATASET_REPOSITORY = "https://github.com/AhmedBaset/hadith-json/tree";

function getBookSourceUrl(bookKey, version) {
  if (!BOOKS[bookKey]) throw new Error(`Unsupported hadith book: ${bookKey}`);
  if (!version || !/^[A-Za-z0-9._-]+$/.test(version)) throw new Error("Hadith source version must be a release tag, branch, or commit identifier");
  return `https://raw.githubusercontent.com/AhmedBaset/hadith-json/${version}/db/by_book/the_9_books/${bookKey}.json`;
}

function createHadithSource({ bookKey, version, usageBasis, approved }) {
  const book = BOOKS[bookKey];
  if (!book) throw new Error(`Unsupported hadith book: ${bookKey}`);
  return createSource({
    sourceId: `ahmedbaset-hadith-${bookKey}`,
    title: book.title,
    type: "hadith",
    language: "ar-en",
    reference: `${book.title}, hadith in-book numbering`,
    url: getBookSourceUrl(bookKey, version),
    version,
    usageBasis,
    approved,
    metadata: {
      collection: book.title,
      collectionArabic: book.arabicTitle,
      dataset: "AhmedBaset/hadith-json",
      datasetRepository: `${DATASET_REPOSITORY}/${version}/db/by_book/the_9_books`,
      bookId: book.bookId,
      datasetBookSlug: book.slug,
    },
  });
}

function buildHadithChunk(hadith, source) {
  if (!hadith || !Number.isInteger(hadith.idInBook) || !hadith.arabic || !hadith.chapter) throw new Error("Parsed hadith with chapter metadata is required");
  if (!source || source.type !== "hadith" || source.approved !== true) throw new Error("An explicitly approved hadith source is required");
  if (Number(source.metadata.bookId) !== hadith.bookId) throw new Error("Hadith book and source book do not match");

  const textParts = [
    `Collection: ${source.title}`,
    `Chapter: ${hadith.chapter.english}${hadith.chapter.arabic ? ` / ${hadith.chapter.arabic}` : ""}`,
    `Hadith number: ${hadith.idInBook}`,
    `Arabic:\n${hadith.arabic}`,
  ];
  const english = [hadith.english.narrator, hadith.english.text].filter(Boolean).join("\n");
  if (english) textParts.push(`English:\n${english}`);

  return createChunk({
    chunkId: `${source.sourceId}-${hadith.idInBook}`,
    sourceId: source.sourceId,
    text: textParts.join("\n\n"),
    metadata: {
      ...source.metadata,
      category: "hadith",
      sourceType: "hadith",
      sourceTitle: source.title,
      url: `https://sunnah.com/${source.metadata.datasetBookSlug}:${hadith.idInBook}`,
      datasetUrl: source.url,
      language: "ar-en",
      languages: hadith.languages,
      version: source.version,
      usageBasis: source.usageBasis,
      approved: source.approved,
      reference: `${source.title} ${hadith.idInBook}`,
      hadithCollection: source.title,
      hadithNumber: hadith.idInBook,
      bookId: hadith.bookId,
      chapterId: hadith.chapterId,
      chapterTitle: hadith.chapter.english,
      chapterTitleArabic: hadith.chapter.arabic,
      narrator: hadith.english.narrator || null,
    },
  });
}

module.exports = { DATASET_REPOSITORY, getBookSourceUrl, createHadithSource, buildHadithChunk };
