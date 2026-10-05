const {
  QUESTION_CATEGORIES,
  QUESTION_LEVELS,
  RISK_LEVELS,
  AI_ACTIONS,
} = require("../contracts/aiTypes");

/**
 * Classification rules for the Bayyinah AI classifier.
 *
 * These rules are based on the approved scientific framework:
 *
 * A: Stable foundational information
 * B: Explanation, definition, or reasoning
 * C: Disputed or high-sensitivity issues
 * D: Personal fatwa / individual case
 *
 * The classifier should prefer caution when the question
 * contains ambiguity or requests a personal ruling.
 */

const CLASSIFIER_RULES = Object.freeze({
  levels: Object.freeze({
    [QUESTION_LEVELS.A]: {
      description: "Stable foundational Islamic information.",
      defaultRisk: RISK_LEVELS.LOW,
      defaultAction: AI_ACTIONS.ANSWER,
    },

    [QUESTION_LEVELS.B]: {
      description: "Explanation, definition, or reasoning.",
      defaultRisk: RISK_LEVELS.LOW,
      defaultAction: AI_ACTIONS.ANSWER,
    },

    [QUESTION_LEVELS.C]: {
      description: "Disputed or high-sensitivity Islamic issue.",
      defaultRisk: RISK_LEVELS.MEDIUM,
      defaultAction: AI_ACTIONS.ANSWER,
    },

    [QUESTION_LEVELS.D]: {
      description: "Personal ruling or individual case.",
      defaultRisk: RISK_LEVELS.HIGH,
      defaultAction: AI_ACTIONS.REFER,
    },
  }),

  categories: Object.freeze({
    [QUESTION_CATEGORIES.GENERAL_ISLAM]: {
      description: "General questions about Islam.",
    },

    [QUESTION_CATEGORIES.QURAN]: {
      description: "Questions about the Quran.",
    },

    [QUESTION_CATEGORIES.HADITH]: {
      description: "Questions about Hadith.",
    },

    [QUESTION_CATEGORIES.TAFSIR]: {
      description: "Questions about Quran interpretation.",
    },

    [QUESTION_CATEGORIES.AQEEDAH]: {
      description: "Questions about Islamic creed.",
    },

    [QUESTION_CATEGORIES.FIQH]: {
      description: "Questions about Islamic jurisprudence.",
    },

    [QUESTION_CATEGORIES.SEERAH_HISTORY]: {
      description: "Questions about Seerah and Islamic history.",
    },

    [QUESTION_CATEGORIES.OBJECTIONS]: {
      description: "Questions or objections about Islam.",
    },

    [QUESTION_CATEGORIES.TERMINOLOGY]: {
      description: "Questions about Islamic terminology.",
    },

    [QUESTION_CATEGORIES.TRANSLATION]: {
      description: "Questions involving translation of Islamic content.",
    },

    [QUESTION_CATEGORIES.OTHER]: {
      description: "Questions that do not fit another category.",
    },
  }),

  indicators: Object.freeze({
    // A personal religious ruling in any wording: always Level D.
    personalRuling: Object.freeze([
        "is it permissible for me",
        "is it haram for me",
        "is it halal for me",
        "هل يجوز لي",
        "هل يحل لي",
        "هل يحرم علي",
    ]),
    // Personal wording that is Level D only when the question is about a
    // religious matter (see religiousContext); "Which phone should I buy?" is not.
    // English phrases match whole words: "can i" does not match "can islam".
    personalCase: Object.freeze([
        "in my case",
        "in my situation",
        "what should i do",
        "is it allowed for me",
        "am i allowed",
        "can i",
        "should i",
        "my wife",
        "my husband",
        "my marriage",
        "my divorce",
        "my family",
        "my situation",
        "في حالتي",
        "في وضعي",
        "ماذا افعل",
        "ما الذي ينبغي لي",
        "زوجتي",
        "زوجي",
        "زواجي",
        "طلاقي",
        "عائلتي",
    ]),
    // Terms that make a personal question a religious one. Matched as whole
    // words (Arabic allows the proclitics و ف ب ل ك ال), already normalized.
    religiousContext: Object.freeze([
        "islam", "islamic", "muslim", "muslims", "non-muslim", "allah", "god", "prophet",
        "quran", "qur'an", "koran", "hadith", "sunnah", "sharia", "shariah", "fiqh", "fatwa",
        "halal", "haram", "permissible", "impermissible", "makruh", "mahram", "sin", "sins", "sinful",
        "religion", "religious", "deen", "pray", "praying", "prayer", "prayers", "salah", "salat",
        "fast", "fasting", "ramadan", "zakat", "zakah", "hajj", "umrah", "wudu", "ablution",
        "mosque", "masjid", "imam", "eid", "christmas", "easter", "church", "temple", "riba",
        "alcohol", "wine", "beer", "pork", "hijab", "niqab", "marry", "marriage", "married",
        "divorce", "nikah", "talaq", "iddah", "dua", "shirk", "jinn", "qibla", "adhan",
        // Everyday topics people most often ask a ruling about.
        "gelatin", "gelatine", "lard", "meat", "slaughter", "zabiha", "dhabiha", "music",
        "tattoo", "tattoos", "gambling", "gamble", "lottery", "mortgage", "interest",
        "dating", "girlfriend", "boyfriend", "zina",
        "الله", "لله", "اسلام", "اسلامي", "مسلم", "مسلمه", "مسلمة", "مسلمين", "مسلمون", "حرام", "حلال",
        "يجوز", "يحل", "يحرم", "حكم", "فتوي", "شرع", "شرعا", "شرعي", "صلاة", "صلاتي", "صلوات",
        "صوم", "صيام", "رمضان", "زكاة", "حج", "عمرة", "وضوء", "مسجد", "نكاح", "زواج", "طلاق",
        "اطلق", "اطلقها", "ربا", "خمر", "كنيسة", "كريسماس", "الميلاد", "كافر", "نبي", "رسول",
        "قران", "حديث", "حجاب", "ذنب", "اثم",
        "جيلاتين", "خنزير", "لحم", "ذبيحة", "موسيقي", "اغاني", "وشم", "قمار", "يانصيب", "فوائد", "قرض",
    ]),
    sensitiveOrDisputed: Object.freeze([
    "is it haram",
    "is it halal",
    "different scholars",
    "scholars disagree",
    "scholars differed",
    "there is a difference of opinion",
    "difference of opinion",
    "controversial",
    "disputed",
    "ruling on",
    "what is the ruling",
    "هل هذا حرام",
    "هل هذا حلال",
    "ما حكم",
    "حكم",
    "اختلف العلماء",
    "اختلاف العلماء",
    "خلاف العلماء",
    "مسألة خلافية",
    ]),
    categoryKeywords: Object.freeze({
    [QUESTION_CATEGORIES.QURAN]: Object.freeze([
      "quran",
      "koran",
      "verse",
      "ayah",
      "surah",
      "chapter of the quran",
      "القران",
      "سورة",
      "اية",
      "آية",
    ]),

    [QUESTION_CATEGORIES.HADITH]: Object.freeze([
      "hadith",
      "hadiths",
      "sunnah",
      "prophetic tradition",
      "authentic hadith",
      "حديث",
      "الحديث",
      "السنة النبوية",
      // What the Prophet ﷺ said or taught.
      "prophet say",
      "prophet said",
      "prophet says",
      "prophet teach",
      "prophet taught",
      "prophet muhammad say",
      "prophet muhammad said",
      "messenger of allah say",
      "messenger of allah said",
      "قال النبي",
      "قال رسول الله",
      "قال الرسول",
      "يقول النبي",
      "عن النبي",
      "احاديث",
    ]),

    [QUESTION_CATEGORIES.TAFSIR]: Object.freeze([
      "tafsir",
      "interpretation of the quran",
      "meaning of this verse",
      "explanation of this verse",
      "quranic interpretation",
      "تفسير",
      "المعنى لهذه الاية",
    ]),

    [QUESTION_CATEGORIES.AQEEDAH]: Object.freeze([
      "tawhid",
      "oneness of god",
      "attributes of Allah",
      "belief in Allah",
      "aqeedah",
      "creed",
      "التوحيد",
      "العقيدة",
      // Theology: the unseen, the afterlife, divine decree, prophethood.
      "theology",
      "angels",
      "day of judgment",
      "day of judgement",
      "judgment day",
      "afterlife",
      "hereafter",
      "paradise",
      "jannah",
      "hellfire",
      "jahannam",
      "qadar",
      "predestination",
      "divine decree",
      "names of allah",
      "attributes of god",
      "prophethood",
      "resurrection",
      "pillars of iman",
      "pillars of faith",
      "articles of faith",
      "shirk",
      "الملائكة",
      "اليوم الاخر",
      "يوم القيامة",
      "الجنة",
      "القضاء والقدر",
      "اسماء الله",
      "صفات الله",
      "اركان الايمان",
      "الشرك",
      "البعث",
    ]),

    [QUESTION_CATEGORIES.FIQH]: Object.freeze([
      "fiqh",
      "islamic law",
      "ruling",
      "permissible",
      "impermissible",
      "يجوز",
      "الطلاق",
      "halal",
      "haram",
      "فقه",
      "حلال",
      "حرام",
      "حكم",
    ]),

    [QUESTION_CATEGORIES.SEERAH_HISTORY]: Object.freeze([
      "seerah",
      "sirah",
      "prophet muhammad",
      "islamic history",
      "early muslims",
      "battle of",
    ]),

    [QUESTION_CATEGORIES.OBJECTIONS]: Object.freeze([
  "why is islam wrong",
  "why is islam false",
  "is islam false",
  "is islam wrong",
  "criticism of islam",
  "objection to islam",
  "contradiction in the quran",
  "contradiction in islam",
  "problem with islam",
  "problem with the quran",
]),

    [QUESTION_CATEGORIES.GENERAL_ISLAM]: Object.freeze([
  "about islam",
  "what is islam",
  "ما هو الاسلام",
  "why do muslims",
  "why does islam",
  "islam teaches",
  "muslims believe",
  "muslims practice",
]),

    [QUESTION_CATEGORIES.TERMINOLOGY]: Object.freeze([
      "what does",
      "what is the meaning of",
      "term",
      "terminology",
      "definition",
    ]),

    [QUESTION_CATEGORIES.TRANSLATION]: Object.freeze([
      "translate",
      "translation",
      "how do you say",
      "meaning in english",
      "meaning in arabic",
    ]),
    }),
    
}),
});

module.exports = {
  CLASSIFIER_RULES,
};
