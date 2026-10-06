// Every hadith in the knowledge base comes from Sahih al-Bukhari or Sahih
// Muslim, whose hadiths are graded "صحيح". A grade stored on the chunk wins.
const SAHIH_COLLECTIONS = new Set(["sahih al-bukhari", "sahih muslim"]);
const SAHIH_GRADE = "صحيح";

/** The grade to show for a hadith citation, or null when unknown / not a hadith. */
function hadithGradeOf(metadata = {}) {
  const stored = metadata.hadithGrade || metadata.grade;
  if (stored) return stored;
  if ((metadata.sourceType || metadata.category) !== "hadith") return null;
  const collection = String(metadata.hadithCollection || metadata.collection || metadata.sourceTitle || "")
    .trim()
    .toLowerCase();
  return SAHIH_COLLECTIONS.has(collection) ? SAHIH_GRADE : null;
}

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
    hadithGrade: hadithGradeOf(metadata),
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

// Arabic surah names, index = surah number - 1 (same list as the client's SURAH_NAMES_AR).
const ARABIC_SURAH_NAMES = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة",
  "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت",
  "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر",
  "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم",
  "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات",
  "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق",
  "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق",
  "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل",
  "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس",
];

const VERSE_SOURCE_TYPES = ["quran", "tafsir", "translation"];
// Longest same-surah range expanded verse by verse (Al-Baqarah has 286 ayahs).
const MAX_EXPANDED_RANGE = 286;

function isVerse(surahNumber, ayahNumber) {
  return Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114 &&
    Number.isInteger(ayahNumber) && ayahNumber >= 1;
}

function surahDisplayName(surahNumber, language = "en", metadataName = null) {
  if (language === "ar") {
    return ARABIC_SURAH_NAMES[surahNumber - 1] ||
      String(metadataName || "").replace(/^سورة\s*/u, "") || `سورة ${surahNumber}`;
  }
  return ENGLISH_SURAH_NAMES[surahNumber - 1] || `Quran ${surahNumber}`;
}

/**
 * "(الإخلاص 112:1)" / "(Al-Ikhlas 112:1)", or for tafsir
 * "(تفسير البقرة 2:163)" / "(Tafsir on Al-Baqarah 2:163)".
 * An endAyah in the same surah gives a range: "(Tafsir on Ali 'Imran 3:130–133)".
 */
function buildVerseReference({ surahNumber, ayahNumber, endAyah = null, tafsir = false, language = "en", surahName = null }) {
  const range = Number.isInteger(endAyah) && endAyah > ayahNumber ? `–${endAyah}` : "";
  const verse = `${surahDisplayName(surahNumber, language, surahName)} ${surahNumber}:${ayahNumber}${range}`;
  if (!tafsir) return `(${verse})`;
  return language === "ar" ? `(تفسير ${verse})` : `(Tafsir on ${verse})`;
}

/**
 * Verses listed in a reference string such as "Quran 2:163",
 * "Quran 3:130–3:133", "Quran 3:130-133" or "Quran 2:1, 2:3".
 */
function parseVerseReference(reference) {
  const keys = [];
  const pattern = /(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[–—-]\s*(?:(\d{1,3})\s*:\s*)?(\d{1,3}))?/gu;
  for (const match of String(reference).matchAll(pattern)) {
    const surah = Number(match[1]);
    const ayah = Number(match[2]);
    if (!isVerse(surah, ayah)) continue;
    keys.push(`${surah}:${ayah}`);
    if (match[4] === undefined) continue;
    const endSurah = match[3] === undefined ? surah : Number(match[3]);
    const endAyah = Number(match[4]);
    if (endSurah === surah && endAyah > ayah && endAyah - ayah <= MAX_EXPANDED_RANGE) {
      for (let next = ayah + 1; next <= endAyah; next += 1) keys.push(`${surah}:${next}`);
    } else if (isVerse(endSurah, endAyah)) {
      // A range across surahs: keep both ends; metadata.references lists the rest.
      keys.push(`${endSurah}:${endAyah}`);
    }
  }
  return keys;
}

/**
 * Every verse an evidence item covers ("2:163"): its own surahNumber/ayahNumber,
 * and for tafsir chunks (which carry no surahNumber/ayahNumber) the verses in
 * metadata.references[] and the metadata.reference label.
 */
function evidenceVerseKeys(item) {
  const citation = item?.citation || {};
  if (!VERSE_SOURCE_TYPES.includes(citation.sourceType || citation.category)) return [];
  const keys = [];
  if (isVerse(citation.surahNumber, citation.ayahNumber)) keys.push(`${citation.surahNumber}:${citation.ayahNumber}`);
  for (const reference of Array.isArray(citation.references) ? citation.references : []) {
    if (typeof reference === "string") keys.push(...parseVerseReference(reference));
    else if (reference && isVerse(Number(reference.surahNumber), Number(reference.ayahNumber))) {
      keys.push(`${Number(reference.surahNumber)}:${Number(reference.ayahNumber)}`);
    }
  }
  if (typeof citation.reference === "string") keys.push(...parseVerseReference(citation.reference));
  return [...new Set(keys)];
}

function buildInlineReference(evidence, language = "en") {
  const citation = evidence?.citation || {};
  const sourceType = citation.sourceType || citation.category;
  const hasVerse = isVerse(citation.surahNumber, citation.ayahNumber);

  if (hasVerse && VERSE_SOURCE_TYPES.includes(sourceType)) {
    return buildVerseReference({
      surahNumber: citation.surahNumber,
      ayahNumber: citation.ayahNumber,
      tafsir: sourceType === "tafsir",
      language,
      surahName: citation.surahName,
    });
  }

  // Tafsir chunks carry their verses only in reference/references ("Quran 3:130–3:133").
  const verseKeys = evidenceVerseKeys(evidence);
  if (verseKeys.length) {
    const [surahNumber, ayahNumber] = verseKeys[0].split(":").map(Number);
    const sameSurah = verseKeys
      .map((key) => key.split(":").map(Number))
      .filter(([surah]) => surah === surahNumber)
      .map(([, ayah]) => ayah);
    const endAyah = Math.max(...sameSurah);
    const consecutive = sameSurah.length === endAyah - Math.min(...sameSurah) + 1;
    return buildVerseReference({
      surahNumber,
      ayahNumber: Math.min(...sameSurah),
      endAyah: consecutive && sameSurah.length > 1 ? endAyah : null,
      tafsir: sourceType === "tafsir",
      language,
    });
  }

  const title = citation.sourceTitle || citation.title;
  const reference = citation.reference;
  const hasText = (value) => typeof value === "string" && value.trim();

  // Hadith references already start with the collection name
  // ("Sahih al-Bukhari 7270"); do not repeat it as "(Sahih al-Bukhari, Sahih al-Bukhari 7270)".
  if (hasText(title) && hasText(reference) && reference.trim().startsWith(title.trim())) {
    return `(${reference.trim()})`;
  }

  const parts = [title, reference].filter(hasText);
  return parts.length ? `(${parts.join(", ")})` : null;
}

function buildInlineReferences(evidence, language = "en") {
  if (!Array.isArray(evidence)) throw new Error("Evidence must be an array");
  return [...new Set(evidence.map((item) => buildInlineReference(item, language)).filter(Boolean))];
}

module.exports = {
  hadithGradeOf,
  SAHIH_GRADE,
  buildCitation,
  buildCitations,
  buildInlineReference,
  buildInlineReferences,
  buildVerseReference,
  evidenceVerseKeys,
  parseVerseReference,
  isVerse,
  ENGLISH_SURAH_NAMES,
  ARABIC_SURAH_NAMES,
};
