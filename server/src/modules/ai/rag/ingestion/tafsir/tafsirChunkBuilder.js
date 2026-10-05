const crypto = require("crypto");
const { createChunk } = require("../chunkContract");
const { createSource } = require("../sourceContract");

const SOURCE_ID = "quranpedia-tafsir-book-1";
const SOURCE_URL = "https://api.quranpedia.net/dumps/tafsir-book-1.json.gz";

function createTafsirSource({ version, usageBasis, approved = true }) {
  return createSource({
    sourceId: SOURCE_ID,
    title: "تيسير التفسير",
    type: "tafsir",
    language: "ar",
    reference: "Quranpedia Tafsir Book 1",
    url: SOURCE_URL,
    version,
    license: "Quranpedia dataset usage terms",
    usageBasis,
    approved,
    metadata: {
      author: "إبراهيم القطان",
      bookId: 1,
      bookName: "تيسير التفسير",
      shortName: "القطان",
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

function buildTafsirChunk(block, source) {
  if (!block || !Array.isArray(block.references) || !block.references.length || !block.text) throw new Error("A parsed tafsir block is required");
  if (!source || source.sourceId !== SOURCE_ID || source.approved !== true) throw new Error("An approved Quranpedia tafsir source is required");
  const reference = formatReferences(block.references);
  const digest = crypto.createHash("sha256").update(block.text).digest("hex").slice(0, 12);
  const chunkId = `${SOURCE_ID}-p${block.part}-pg${block.pageNumber}-a${block.globalAyahNumbers.join("-")}-${digest}`;
  return createChunk({
    chunkId,
    sourceId: SOURCE_ID,
    text: block.text,
    metadata: {
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
    },
  });
}

module.exports = { SOURCE_ID, SOURCE_URL, createTafsirSource, formatReferences, buildTafsirChunk };
