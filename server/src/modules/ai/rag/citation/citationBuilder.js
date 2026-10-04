/**
 * Builds a citation object from retrieved evidence.
 *
 * The citation keeps the generated answer traceable
 * to the exact source chunk used by the RAG system.
 *
 * Important:
 * A citation identifies the source.
 * It does NOT by itself prove that the generated claim
 * is correctly supported. That is handled later by
 * citation and evidence verification.
 *
 * @param {Object} evidence
 * @returns {Object}
 */
function buildCitation(evidence) {
  if (!evidence || typeof evidence !== "object") {
    throw new Error("Evidence is required");
  }

  if (!evidence.sourceId || typeof evidence.sourceId !== "string") {
    throw new Error("Evidence sourceId is required");
  }

  if (!evidence.chunkId || typeof evidence.chunkId !== "string") {
    throw new Error("Evidence chunkId is required");
  }

  if (!evidence.text || typeof evidence.text !== "string") {
    throw new Error("Evidence text is required");
  }

  if (!evidence.citation || typeof evidence.citation !== "object") {
    throw new Error("Evidence citation is required");
  }

  const metadata = evidence.citation;

  return {
    sourceId: evidence.sourceId,
    chunkId: evidence.chunkId,
    sourceTitle: metadata.sourceTitle || metadata.title || null,
    sourceUrl: metadata.sourceUrl || metadata.url || metadata.source || null,
    sourceType: metadata.sourceType || null,
    category: metadata.category || null,
    language: metadata.language || null,
    version: metadata.version || metadata.sourceVersion || null,
    license: metadata.license || null,
    usageBasis: metadata.usageBasis || null,
    reference: metadata.reference || null,
    author: metadata.author || null,
    volume: metadata.volume || null,
    pageNumber: metadata.pageNumber ?? metadata.page ?? null,
    hadithCollection: metadata.hadithCollection || metadata.collection || null,
    hadithNumber: metadata.hadithNumber || null,
    hadithGrade: metadata.hadithGrade || metadata.grade || null,
    gradingSource: metadata.gradingSource || null,
    surahNumber: metadata.surahNumber ?? null,
    surahName: metadata.surahName || null,
    ayahNumber: metadata.ayahNumber ?? null,
  };
}

/**
 * Builds citations from multiple evidence items.
 *
 * @param {Object[]} evidence
 * @returns {Object[]}
 */
function buildCitations(evidence) {
  if (!Array.isArray(evidence)) {
    throw new Error("Evidence must be an array");
  }

  return evidence.map(buildCitation);
}

const ENGLISH_SURAH_NAMES = [
  "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf",
  "Al-Anfal", "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl",
  "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur",
  "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum", "Luqman",
  "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad",
  "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
  "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah",
  "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah",
  "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan",
  "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin",
  "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyinah",
  "Az-Zalzalah", "Al-Adiyat", "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil",
  "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
];

function buildInlineReference(evidence, language = "en") {
  const citation = evidence?.citation || {};
  const sourceType = citation.sourceType || citation.category;
  const hasVerse = Number.isInteger(citation.surahNumber) && citation.surahNumber > 0 &&
    Number.isInteger(citation.ayahNumber) && citation.ayahNumber > 0;

  if (hasVerse && ["quran", "tafsir", "translation"].includes(sourceType)) {
    const verse = `${citation.surahNumber}:${citation.ayahNumber}`;
    const englishSurahName = ENGLISH_SURAH_NAMES[citation.surahNumber - 1];
    if (sourceType === "tafsir") {
      if (language === "ar") {
        const surahName = String(citation.surahName || "").replace(/^سورة\s*/u, "");
        return surahName ? `(تفسير ${surahName} ${verse})` : `(تفسير القرآن ${verse})`;
      }
      return `(Tafsir on ${englishSurahName || `Quran ${citation.surahNumber}`} ${verse})`;
    }
    if (language === "ar") {
      const surahName = String(citation.surahName || "").replace(/^سورة\s*/u, "");
      return surahName ? `(${surahName} ${verse})` : `(القرآن ${verse})`;
    }
    return `(${englishSurahName || `Quran ${citation.surahNumber}`} ${verse})`;
  }

  const parts = [citation.sourceTitle || citation.title, citation.reference].filter((part) => typeof part === "string" && part.trim());
  return parts.length ? `(${parts.join(", ")})` : null;
}

function buildInlineReferences(evidence, language = "en") {
  if (!Array.isArray(evidence)) throw new Error("Evidence must be an array");
  return [...new Set(evidence.map((item) => buildInlineReference(item, language)).filter(Boolean))];
}

module.exports = {
  buildCitation,
  buildCitations,
  buildInlineReference,
  buildInlineReferences,
};
