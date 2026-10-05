const {
  createLLMProvider,
} = require("../providers/llmProvider");

const {
  buildGenerationPrompt,
} = require("../prompts/generationPrompt");

const {
  createDraft,
} = require("../contracts/draftContract");

const {
  buildCitations,
  buildInlineReferences,
  buildVerseReference,
  evidenceVerseKeys,
  parseVerseReference,
  isVerse,
  ENGLISH_SURAH_NAMES,
  ARABIC_SURAH_NAMES,
} = require("../rag/citation/citationBuilder");

const ENGLISH_ARABIC_TAFSIR_NOTICE =
  "This is an English explanation of the original Arabic source, not an English source quotation.";

// One retry for drafts that fail validation (see generateDraft).
const MAX_GENERATION_ATTEMPTS = 2;

/** A generated draft that must not be accepted; asking the model again may help. */
class DraftValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "DraftValidationError";
  }
}

function hasArabicTafsirEvidence(evidence) {
  return evidence.some((item) => {
    const citation = item.citation || {};
    const sourceType = citation.sourceType || citation.category;
    const languages = [citation.language, ...(citation.languages || [])]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return sourceType === "tafsir" && languages.some((value) => value === "ar" || value === "ar-en");
  });
}

function preserveEnglishTafsirNotice(answer, language, evidence) {
  if (language !== "en" || !hasArabicTafsirEvidence(evidence)) return answer;

  const firstSentence = answer.trim().split(/[.!?。！？]/, 1)[0];
  const equivalentNotice = /english explanation/i.test(firstSentence) &&
    /arabic (?:tafsir|source)/i.test(firstSentence) &&
    /not (?:the )?original|not .*quotation|not .*quote/i.test(firstSentence);
  return equivalentNotice ? answer : `${ENGLISH_ARABIC_TAFSIR_NOTICE} ${answer}`;
}

function assertDraftLanguage(answer, language) {
  const arabicLetters = (answer.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/gu) || []).length;
  const latinLetters = (answer.match(/[A-Za-z]/gu) || []).length;
  const matches = language === "ar" ? arabicLetters > latinLetters : latinLetters > arabicLetters;
  if (!matches) throw new DraftValidationError("Generated draft does not match the question language");
}

function hasOwnVerse(item) {
  const citation = item?.citation || {};
  return isVerse(citation.surahNumber, citation.ayahNumber);
}

const EASTERN_ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/gu;
function toAsciiDigits(text) {
  return text.replace(EASTERN_ARABIC_DIGITS, (digit) => String(digit.charCodeAt(0) % 16));
}

function normalizeName(text) {
  return toAsciiDigits(String(text))
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/gu, "") // tashkeel, dagger alef, tatweel
    .replace(/[أإآٱ]/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ة/gu, "ه")
    .replace(/[^\p{L}\p{N}:]+/gu, " ")
    .replace(/\bal\s+/gu, "al")
    .trim();
}

// Surah names in a form that survives transliteration and spelling variants.
const SURAH_NAME_PATTERNS = [...ENGLISH_SURAH_NAMES, ...ARABIC_SURAH_NAMES]
  .map((name, index) => ({ surahNumber: (index % 114) + 1, name: normalizeName(name) }))
  .sort((a, b) => b.name.length - a.name.length)
  .map(({ surahNumber, name }) => ({
    surahNumber,
    // The ayah number must follow the name: "البقرة 163", "البقرة، الآية 163", "Al-Baqarah, verse 163".
    pattern: new RegExp(`(?:^|\\s)(?:سوره\\s+|surah\\s+)?${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(?:(?:الايه|ايه|ayah|aya|verse)\\s+)?(\\d{1,3})(?:\\s|$)`, "u"),
  }));

/** The verse a parenthetical marker cites by surah name + ayah ("البقرة، الآية 163"), or null. */
function namedVerseKey(marker) {
  const text = ` ${normalizeName(marker)} `;
  for (const { surahNumber, pattern } of SURAH_NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match && isVerse(surahNumber, Number(match[1]))) return `${surahNumber}:${Number(match[1])}`;
  }
  return null;
}

/** Every verse the answer cites in parentheses, by number ("2:163") or by surah name + ayah. */
function citedVerseKeys(answer) {
  const keys = new Set();
  for (const [, inner] of answer.matchAll(/\(([^()]*)\)/gu)) {
    const numbered = parseVerseReference(toAsciiDigits(inner));
    numbered.forEach((key) => keys.add(key));
    if (!numbered.length) {
      const named = namedVerseKey(inner);
      if (named) keys.add(named);
    }
  }
  return keys;
}

function canonicalVerseReference(key, marker, verseEvidence, language) {
  const item = verseEvidence.find((candidate) => hasOwnVerse(candidate) &&
    `${candidate.citation.surahNumber}:${candidate.citation.ayahNumber}` === key);
  if (item) return buildInlineReferences([item], language)[0];
  // A verse known only from a tafsir chunk's references.
  const [surahNumber, ayahNumber] = key.split(":").map(Number);
  return buildVerseReference({ surahNumber, ayahNumber, tafsir: /تفسير|tafsir/iu.test(marker), language });
}

function addEvidenceReferences(answer, evidence, language) {
  const verseEvidence = evidence.filter((item) => evidenceVerseKeys(item).length > 0);
  const knownVerseKeys = new Set(verseEvidence.flatMap(evidenceVerseKeys));
  const nonVerseLabels = evidence.filter((item) => !verseEvidence.includes(item)).flatMap(({ citation = {} }) => [citation.reference, citation.sourceTitle].filter(Boolean));

  const normalizeMarker = (marker, key) => {
    if (!knownVerseKeys.has(key)) throw new DraftValidationError("Generated Quran reference is not present in the evidence");
    return canonicalVerseReference(key, marker, verseEvidence, language);
  };

  let normalized = answer.replace(/\(([^()]*)\)/gu, (marker, inner) => {
    if (!knownVerseKeys.size || nonVerseLabels.some((label) => marker.includes(label))) return marker;
    const asciiInner = toAsciiDigits(inner);
    const match = asciiInner.match(/(\d{1,3})\s*:\s*(\d{1,3})/u);
    if (match) return normalizeMarker(marker, `${Number(match[1])}:${Number(match[2])}`);
    const named = namedVerseKey(inner);
    return named ? normalizeMarker(marker, named) : marker;
  }).trim();

  // Append a reference only for evidence the draft does not already cite,
  // matched by verse (any surah name or number + ayah), not by exact wording.
  const cited = citedVerseKeys(normalized);
  const missingReferences = [...new Set(evidence
    .filter((item) => {
      const keys = evidenceVerseKeys(item);
      if (keys.length) return !keys.some((key) => cited.has(key));
      const reference = buildInlineReferences([item], language)[0];
      const label = item.citation?.reference;
      return reference && !normalized.includes(reference) && !(label && normalized.includes(label));
    })
    .map((item) => buildInlineReferences([item], language)[0])
    .filter(Boolean))];
  if (missingReferences.length) normalized = `${normalized} ${missingReferences.join(" ")}`.trim();
  return normalized;
}

/**
 * Creates a draft generator.
 *
 * The generator is responsible only for producing
 * an AI draft from a question and retrieved evidence.
 *
 * It does not publish the answer.
 *
 * @param {Object} config
 * @param {Object} config.llmProvider
 * @param {string} [config.model]
 * @returns {Object}
 */
function createDraftGenerator({
  llmProvider,
  model = "default",
}) {
  const llm = createLLMProvider(llmProvider);

  /**
   * Generates a draft answer.
   *
   * @param {Object} input
   * @param {string} input.question
   * @param {string} input.language
   * @param {Object[]} input.evidence
   * @returns {Promise<Object>}
   */
  async function generateDraft({
    question,
    language,
    evidence,
  }) {
    const prompt = buildGenerationPrompt({
      question,
      language,
      evidence,
    });

    // The model is not deterministic: an occasional draft fails validation
    // (wrong language, or a verse number that is not in the evidence) while the
    // next one is fine. Validation stays strict, so an invented reference is
    // never accepted; we only ask again once before giving up.
    let lastError;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const answer = await llm.generate(prompt, {
        model,
        temperature: 0.2,
        maxOutputTokens: 1200,
        taskType: "draft_generation",
      });

      try {
        assertDraftLanguage(answer, language);

        const answerWithSourceNotice = preserveEnglishTafsirNotice(
          answer,
          language,
          evidence
        );
        const answerWithReferences = addEvidenceReferences(answerWithSourceNotice, evidence, language);
        const citations = buildCitations(evidence);

        return createDraft({
          answer: answerWithReferences,
          language,
          citations,
        });
      } catch (error) {
        // Provider and contract errors are not retried.
        if (!(error instanceof DraftValidationError)) throw error;
        lastError = error;
      }
    }

    throw lastError;
  }

  return {
    generateDraft,
  };
}

module.exports = {
  createDraftGenerator,
  DraftValidationError,
  MAX_GENERATION_ATTEMPTS,
  ENGLISH_ARABIC_TAFSIR_NOTICE,
  preserveEnglishTafsirNotice,
  assertDraftLanguage,
  addEvidenceReferences,
  evidenceVerseKeys,
  parseVerseReference,
  citedVerseKeys,
};
