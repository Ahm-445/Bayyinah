// Decides which retrieved evidence a dāʿī's final text actually cites.
// Mirrors the Frontend's rules (client/src/shared/lib/references.js):
// a verse is cited by its "surah:ayah" number, anything else by its reference.

const { evidenceVerseKeys } = require("../modules/ai/rag/citation/citationBuilder");

// Older chunk ids that carry the verse at the end ("quran-hafs-51-56").
const VERSE_CHUNK =
  /(?:quran-hafs|quran-translation-\d+|tafsir-book-1)-(\d+)-(\d+)$/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lifts fields the AI module keeps either on the item or in item.citation. */
function normalizeEvidence(item) {
  const citation = item.citation || {};

  return {
    sourceId: item.sourceId,
    chunkId: item.chunkId,
    text: item.text,
    score: item.score,
    citation: {
      ...citation,
      sourceTitle: citation.sourceTitle ?? item.sourceTitle ?? citation.title ?? null,
      reference: citation.reference ?? item.reference ?? null,
      sourceType:
        citation.sourceType ?? item.sourceType ?? citation.category ?? null,
      language: citation.language ?? item.language ?? null,
      surahNumber: citation.surahNumber ?? item.surahNumber ?? null,
      ayahNumber: citation.ayahNumber ?? item.ayahNumber ?? null,
    },
  };
}

/**
 * Every verse ("51:56") an evidence item covers: surahNumber/ayahNumber, the
 * verses in a tafsir chunk's reference/references ("Quran 3:130–3:133"), or
 * the verse at the end of an older chunk id.
 */
function verseKeysOf(evidence) {
  const keys = evidenceVerseKeys(normalizeEvidence(evidence));
  if (keys.length) return keys;
  const match = String(evidence.chunkId || "").match(VERSE_CHUNK);
  return match ? [`${Number(match[1])}:${Number(match[2])}`] : [];
}

function isCitedIn(text, evidence) {
  if (!text) return false;
  const verseKeys = verseKeysOf(evidence);
  if (verseKeys.length) {
    // "51:56" must not match "151:56" or "51:567".
    return verseKeys.some((key) =>
      new RegExp(`(^|[^\\d:])${escapeRegExp(key)}(?!\\d)`).test(text)
    );
  }
  const reference =
    evidence.citation?.reference || evidence.citation?.sourceTitle;
  if (!reference) return false;
  return new RegExp(`${escapeRegExp(reference)}(?!\\d)`).test(text);
}

/**
 * Citations (deduplicated) for the evidence that finalText mentions.
 * @returns {Object[]}
 */
function citationsFromText(finalText, evidence) {
  const seen = new Set();
  const citations = [];

  for (const item of evidence || []) {
    const key = `${item.sourceId}:${item.chunkId}`;

    if (seen.has(key) || !isCitedIn(finalText, item)) continue;

    seen.add(key);
    citations.push({
      sourceId: item.sourceId,
      chunkId: item.chunkId,
      sourceTitle: item.citation?.sourceTitle ?? null,
      reference: item.citation?.reference ?? null,
    });
  }

  return citations;
}

module.exports = { normalizeEvidence, verseKeysOf, isCitedIn, citationsFromText };
