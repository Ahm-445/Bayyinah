// Deterministic stand-in for modules/ai, chosen by words in the question:
//   "boom" -> the pipeline throws     "refer" -> REFER (level D)
//   "abstain" -> ABSTAIN, no draft    "warn" -> ANSWER with NEEDS_REVIEW
//   anything else -> ANSWER, PASS

const QURAN_EVIDENCE = {
  sourceId: "quranpedia-quran-hafs",
  chunkId: "quran-hafs-51-56",
  text: "وَمَا خَلَقْتُ الْجِنَّ وَالْإِنسَ إِلَّا لِيَعْبُدُونِ",
  score: 0.91,
  citation: {
    sourceTitle: "القرآن الكريم - حفص عن عاصم",
    reference: "سورة الذاريات، الآية 56",
    sourceType: "quran",
    surahNumber: 51,
    ayahNumber: 56,
  },
};

const HADITH_EVIDENCE = {
  sourceId: "ahmedbaset-hadith-bukhari",
  chunkId: "ahmedbaset-hadith-bukhari-1",
  text: "Actions are judged by intentions.",
  score: 0.74,
  citation: {
    sourceTitle: "Sahih al-Bukhari",
    reference: "Sahih al-Bukhari 1",
    sourceType: "hadith",
  },
};

function answerResult({ status = "PASS", warnings = [] } = {}) {
  return {
    action: "ANSWER",
    classification: {
      category: "aqeedah",
      level: "A",
      risk: "low",
      action: "ANSWER",
      reasons: [],
    },
    safety: { decision: "ALLOW", reason: "Within the allowed automated scope." },
    evidence: [QURAN_EVIDENCE, HADITH_EVIDENCE],
    draft: {
      answer: "AI draft text (Adh-Dhariyat 51:56).",
      language: "en",
      citations: [
        {
          sourceId: QURAN_EVIDENCE.sourceId,
          chunkId: QURAN_EVIDENCE.chunkId,
          sourceTitle: QURAN_EVIDENCE.citation.sourceTitle,
          reference: QURAN_EVIDENCE.citation.reference,
        },
      ],
    },
    verification: {
      status,
      citationValid: true,
      evidenceSupported: status === "PASS",
      unsupportedClaims: [],
      missingCitations: [],
      riskFlags: [],
      warnings,
    },
  };
}

const REFER_RESULT = {
  action: "REFER",
  classification: {
    category: "fiqh",
    level: "D",
    risk: "high",
    action: "REFER",
    reasons: [],
  },
  safety: { decision: "BLOCK", reason: "Personal ruling requires referral." },
  evidence: [],
  draft: null,
  verification: null,
};

const ABSTAIN_RESULT = {
  action: "ABSTAIN",
  classification: {
    category: "other",
    level: "B",
    risk: "low",
    action: "ANSWER",
    reasons: [],
  },
  safety: { decision: "REVIEW", reason: "Retrieved evidence is insufficient." },
  evidence: [],
  draft: null,
  verification: null,
};

async function fakeProcessQuestion({ text }) {
  if (/boom/i.test(text)) throw new Error("provider down");
  if (/refer/i.test(text)) return REFER_RESULT;
  if (/abstain/i.test(text)) return ABSTAIN_RESULT;
  if (/warn/i.test(text)) {
    return answerResult({ status: "NEEDS_REVIEW", warnings: ["Check wording"] });
  }

  return answerResult();
}

module.exports = { fakeProcessQuestion, QURAN_EVIDENCE, HADITH_EVIDENCE };
