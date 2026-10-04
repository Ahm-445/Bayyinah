// Stand-in for modules/ai when no provider keys are configured (AI_MODE=mock).
// It returns the same result shape as the real orchestrator so the Frontend
// and the review flow can be exercised end to end. Mock text is labelled.

const ARABIC = /[؀-ۿ]/;
const PERSONAL = /\b(my|should i|can i|am i|fatwa)\b|هل يجوز لي|زوجتي|زوجي|طلاق|فتوى/i;
const UNRELATED = /\b(python|javascript|football|recipe|bitcoin|weather)\b/i;
const ONENESS = /\b(tawhid|one god|god|allah|unity)\b|توحيد|الله|إله/i;

const VERSES = {
  worship: {
    chunkId: "quran-hafs-51-56",
    surahNumber: 51,
    ayahNumber: 56,
    text: "وَمَا خَلَقْتُ الْجِنَّ وَالْإِنسَ إِلَّا لِيَعْبُدُونِ",
    reference: "سورة الذاريات، الآية 56",
    label: { en: "Adh-Dhariyat 51:56", ar: "الذاريات 51:56" },
  },
  oneness: {
    chunkId: "quran-hafs-112-1",
    surahNumber: 112,
    ayahNumber: 1,
    text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    reference: "سورة الإخلاص، الآية 1",
    label: { en: "Al-Ikhlas 112:1", ar: "الإخلاص 112:1" },
  },
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function evidenceFor(verse) {
  return {
    sourceId: "quranpedia-quran-hafs",
    chunkId: verse.chunkId,
    text: verse.text,
    score: 0.91,
    citation: {
      sourceTitle: "القرآن الكريم - حفص عن عاصم",
      reference: verse.reference,
      sourceType: "quran",
      language: "ar",
      surahNumber: verse.surahNumber,
      ayahNumber: verse.ayahNumber,
    },
  };
}

async function processQuestion({ text, language }) {
  await delay(Number(process.env.MOCK_AI_DELAY_MS ?? 1500));

  const lang = ARABIC.test(text) ? "ar" : language === "ar" ? "ar" : "en";

  if (PERSONAL.test(text)) {
    return {
      action: "REFER",
      classification: {
        category: "fiqh",
        level: "D",
        risk: "high",
        action: "REFER",
        reasons: ["Personal ruling (mock)"],
      },
      safety: {
        decision: "BLOCK",
        reason: "Personal ruling (level D): refer to a qualified scholar.",
      },
      evidence: [],
      draft: null,
      verification: null,
    };
  }

  if (UNRELATED.test(text)) {
    return {
      action: "ABSTAIN",
      classification: {
        category: "other",
        level: "B",
        risk: "low",
        action: "ANSWER",
        reasons: ["No approved source matches (mock)"],
      },
      safety: {
        decision: "REVIEW",
        reason: "Retrieved evidence is insufficient for generation.",
      },
      evidence: [],
      draft: null,
      verification: null,
    };
  }

  const verse = ONENESS.test(text) ? VERSES.oneness : VERSES.worship;
  const marker = `(${verse.label[lang]})`;
  const answer =
    lang === "ar"
      ? `[مسودة تجريبية] هذه مسودة نموذجية للسؤال: «${text}». ${marker}`
      : `[Mock draft] This is a placeholder AI draft for: "${text}". ${marker}`;

  return {
    action: "ANSWER",
    classification: {
      category: "aqeedah",
      level: "A",
      risk: "low",
      action: "ANSWER",
      reasons: ["Stable foundational topic (mock)"],
    },
    safety: { decision: "ALLOW", reason: "Question is within approved scope." },
    evidence: [evidenceFor(verse)],
    draft: {
      answer,
      language: lang,
      citations: [
        {
          sourceId: "quranpedia-quran-hafs",
          chunkId: verse.chunkId,
          sourceTitle: "القرآن الكريم - حفص عن عاصم",
          reference: verse.reference,
        },
      ],
    },
    verification: {
      status: "PASS",
      citationValid: true,
      evidenceSupported: true,
      unsupportedClaims: [],
      missingCitations: [],
      riskFlags: [],
      warnings: [],
    },
  };
}

module.exports = { processQuestion };
