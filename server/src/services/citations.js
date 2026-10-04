// Decides which retrieved evidence a dāʿī's final text actually cites.
// Mirrors the Frontend's rules (client/src/shared/lib/references.js):
// a verse is cited by its "surah:ayah" number, anything else by its reference.

const VERSE_CHUNK =
  /(?:quran-hafs|quran-translation-1947|tafsir-book-1)-(\d+)-(\d+)$/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lifts fields the AI module keeps either on the item or in item.citation. */
function normalizeEvidence(item) {
  const citation = item.citation || {};

  return {
    ...item,
    sourceId: item.sourceId,
    chunkId: item.chunkId,
    text: item.text,
    score: item.score,
    citation: {
      ...citation,
      sourceTitle: citation.sourceTitle ?? item.sourceTitle ?? null,
      reference: citation.reference ?? item.reference ?? null,
      sourceType:
        citation.sourceType ?? item.sourceType ?? citation.category ?? null,
      language: citation.language ?? item.language ?? null,
      surahNumber: citation.surahNumber ?? item.surahNumber ?? null,
      ayahNumber: citation.ayahNumber ?? item.ayahNumber ?? null,
    },
  };
}

function verseOf(evidence) {
  const citation = evidence.citation || {};
  let surah = Number(citation.surahNumber ?? evidence.surahNumber);
  let ayah = Number(citation.ayahNumber ?? evidence.ayahNumber);

  if (!surah || !ayah) {
    const match = String(evidence.chunkId || "").match(VERSE_CHUNK);
    surah = Number(match?.[1]);
    ayah = Number(match?.[2]);
  }

  return surah && ayah ? { surah, ayah } : null;
}

function isCitedIn(text, evidence) {
  if (!text) return false;

  const verse = verseOf(evidence);

  if (verse) {
    // "51:56" must not match "151:56" or "51:567".
    return new RegExp(
      `(^|[^\\d:])${verse.surah}:${verse.ayah}(?!\\d)`
    ).test(text);
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

module.exports = { normalizeEvidence, isCitedIn, citationsFromText };
