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
    personalCase: Object.freeze([
        "in my case",
        "in my situation",
        "what should I do",
        "what should i do",
        "is it permissible for me",
        "is it haram for me",
        "is it halal for me",
        "can I",
        "can i",
        "should I",
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
        "هل يجوز لي",
        "هل يحل لي",
        "هل يحرم علي",
        "زوجتي",
        "زوجي",
        "زواجي",
        "طلاقي",
        "عائلتي",
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
