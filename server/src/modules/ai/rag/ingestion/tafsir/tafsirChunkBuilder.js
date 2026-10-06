const crypto = require("crypto");
const { createChunk } = require("../chunkContract");
const { createSource } = require("../sourceContract");

// Quranpedia tafsir books Bayyinah can ingest, by Quranpedia book id.
// Book 4 (al-Tabari, d. 310 AH) is a tafsir of the first three centuries, as the
// challenge's scientific package requires; book 1 is kept for existing data.
const TAFSIR_BOOKS = Object.freeze({
  1: Object.freeze({
    title: "تيسير التفسير",
    author: "إبراهيم القطان",
    shortName: "القطان",
  }),
  4: Object.freeze({
    title: "جامع البيان في تأويل آي القرآن",
    author: "محمد بن جرير الطبري",
    shortName: "الطبري",
    authorDeathYearHijri: 310,
  }),
});

function tafsirSourceId(bookId) {
  return `quranpedia-tafsir-book-${bookId}`;
}

function tafsirSourceUrl(bookId) {
  return `https://api.quranpedia.net/dumps/tafsir-book-${bookId}.json.gz`;
}

function getTafsirBook(bookId) {
  const book = TAFSIR_BOOKS[Number(bookId)];
  if (!book) throw new Error(`Unsupported Quranpedia tafsir book ${bookId}; supported: ${Object.keys(TAFSIR_BOOKS).join(", ")}`);
  return { bookId: Number(bookId), sourceId: tafsirSourceId(bookId), url: tafsirSourceUrl(bookId), ...book };
}

// Book 1 values, kept for existing callers.
const SOURCE_ID = tafsirSourceId(1);
const SOURCE_URL = tafsirSourceUrl(1);
const SOURCE_IDS = new Set(Object.keys(TAFSIR_BOOKS).map(tafsirSourceId));

function createTafsirSource({ version, usageBasis, approved = true, bookId = 1 }) {
  const book = getTafsirBook(bookId);
  return createSource({
    sourceId: book.sourceId,
    title: book.title,
    type: "tafsir",
    language: "ar",
    reference: `Quranpedia Tafsir Book ${book.bookId}`,
    url: book.url,
    version,
    license: "Quranpedia dataset usage terms",
    usageBasis,
    approved,
    metadata: {
      author: book.author,
      ...(book.authorDeathYearHijri ? { authorDeathYearHijri: book.authorDeathYearHijri } : {}),
      bookId: book.bookId,
      bookName: book.title,
      shortName: book.shortName,
      sourceName: "Quranpedia.net",
      resyncUrl: "https://quranpedia.net/api/v1/changes?since=" + encodeURIComponent(version),
    },
  });
}

function formatReferences(references) {
  const labels = references.map(({ surahNumber, ayahNumber }) => `${surahNumber}:${ayahNumber}`);
  const isRange = labels.every((label, index) => index === 0 || (
    references[index].surahNumber === references[index - 1].surahNumber &&
    references[index].ayahNumber === references[index - 1].ayahNumber + 1
  ));
  if (labels.length > 1 && isRange) return `Quran ${labels[0]}–${labels[labels.length - 1]}`;
  return `Quran ${labels.join(", ")}`;
}

// Longest passage embedded as one chunk. Book 1's longest block is 4,406
// characters, so its chunks (and chunk ids) are unchanged; longer passages, as
// in al-Tabari, are split at paragraph, then sentence, then word boundaries.
const MAX_CHUNK_CHARACTERS = 4500;

function splitLongText(text, maxCharacters = MAX_CHUNK_CHARACTERS) {
  if (text.length <= maxCharacters) return [text];
  const pieces = [];
  let current = "";
  const push = () => { if (current.trim()) pieces.push(current.trim()); current = ""; };
  const units = text.split(/\n+/).flatMap((paragraph) => {
    if (paragraph.length <= maxCharacters) return [paragraph];
    // Sentence ends (Arabic and Latin), then spaces, for over-long paragraphs.
    return paragraph.split(/(?<=[.!?؟۔])\s+/).flatMap((sentence) => {
      if (sentence.length <= maxCharacters) return [sentence];
      const words = [];
      let line = "";
      for (const word of sentence.split(" ")) {
        if (line && line.length + word.length + 1 > maxCharacters) { words.push(line); line = ""; }
        line = line ? `${line} ${word}` : word;
      }
      if (line) words.push(line);
      return words;
    });
  });
  for (const unit of units) {
    if (current && current.length + unit.length + 1 > maxCharacters) push();
    current = current ? `${current}\n${unit}` : unit;
  }
  push();
  return pieces;
}

function chunkMetadata(source, block, reference) {
  return {
    ...source.metadata,
    category: "tafsir",
    sourceType: "tafsir",
    sourceTitle: source.title,
    author: source.metadata.author,
    language: source.language,
    url: source.url,
    version: source.version,
    license: source.license,
    usageBasis: source.usageBasis,
    approved: source.approved,
    reference,
    references: block.references.map(({ surahNumber, ayahNumber }) => ({ surahNumber, ayahNumber })),
    globalAyahNumbers: block.globalAyahNumbers,
    bookId: source.metadata.bookId,
    volume: block.part,
    part: block.part,
    pageNumber: block.pageNumber,
  };
}

/**
 * Chunks for one parsed tafsir passage: one chunk, or several when the passage
 * is longer than MAX_CHUNK_CHARACTERS. Every piece keeps the passage's verses.
 */
function buildTafsirChunks(block, source) {
  if (!block || !Array.isArray(block.references) || !block.references.length || !block.text) throw new Error("A parsed tafsir block is required");
  if (!source || !SOURCE_IDS.has(source.sourceId) || source.approved !== true) throw new Error("An approved Quranpedia tafsir source is required");
  const reference = formatReferences(block.references);
  const digest = crypto.createHash("sha256").update(block.text).digest("hex").slice(0, 12);
  const baseId = `${source.sourceId}-p${block.part}-pg${block.pageNumber}-a${block.globalAyahNumbers.join("-")}-${digest}`;
  const pieces = splitLongText(block.text);
  return pieces.map((text, index) => createChunk({
    chunkId: pieces.length === 1 ? baseId : `${baseId}-s${index + 1}`,
    sourceId: source.sourceId,
    text,
    metadata: {
      ...chunkMetadata(source, block, reference),
      ...(pieces.length > 1 ? { segment: index + 1, segments: pieces.length } : {}),
    },
  }));
}

/** One chunk for a passage short enough not to be split (existing callers). */
function buildTafsirChunk(block, source) {
  const chunks = buildTafsirChunks(block, source);
  if (chunks.length !== 1) throw new Error("Tafsir passage is too long for one chunk; use buildTafsirChunks");
  return chunks[0];
}

module.exports = {
  SOURCE_ID,
  SOURCE_URL,
  TAFSIR_BOOKS,
  MAX_CHUNK_CHARACTERS,
  getTafsirBook,
  tafsirSourceId,
  createTafsirSource,
  formatReferences,
  splitLongText,
  buildTafsirChunk,
  buildTafsirChunks,
};
