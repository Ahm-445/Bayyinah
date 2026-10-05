const {
  createLLMProvider,
} = require("../providers/llmProvider");

const {
  buildGenerationPrompt,
} = require("../prompts/generationPrompt");

const {
  createDraft,
} = require("../contracts/draftContract");

const { buildCitations, buildInlineReferences } = require("../rag/citation/citationBuilder");

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

const VERSE_SOURCE_TYPES = ["quran", "tafsir", "translation"];
// Longest same-surah range we expand verse by verse (Al-Baqarah has 286 ayahs).
const MAX_EXPANDED_RANGE = 286;

function isVerse(surahNumber, ayahNumber) {
  return Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114 &&
    Number.isInteger(ayahNumber) && ayahNumber >= 1;
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
 * Every verse an evidence item covers: its own surahNumber/ayahNumber, and for
 * tafsir chunks (which carry no surahNumber/ayahNumber) the verses in
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

function hasOwnVerse(item) {
  const citation = item?.citation || {};
  return isVerse(citation.surahNumber, citation.ayahNumber);
}

function addEvidenceReferences(answer, evidence, language) {
  const verseEvidence = evidence.filter((item) => evidenceVerseKeys(item).length > 0);
  const knownVerseKeys = new Set(verseEvidence.flatMap(evidenceVerseKeys));
  const nonVerseLabels = evidence.filter((item) => !verseEvidence.includes(item)).flatMap(({ citation = {} }) => [citation.reference, citation.sourceTitle].filter(Boolean));

  let normalized = answer.replace(/\(([^()]*?\d{1,3}\s*:\s*\d{1,3}[^()]*)\)/gu, (marker) => {
    if (!knownVerseKeys.size || nonVerseLabels.some((label) => marker.includes(label))) return marker;
    const match = marker.match(/(\d{1,3})\s*:\s*(\d{1,3})/u);
    const key = `${Number(match[1])}:${Number(match[2])}`;
    if (!knownVerseKeys.has(key)) throw new DraftValidationError("Generated Quran reference is not present in the evidence");
    const item = verseEvidence.find((candidate) => hasOwnVerse(candidate) &&
      `${candidate.citation.surahNumber}:${candidate.citation.ayahNumber}` === key);
    // A verse known only from a tafsir chunk's references keeps the model's marker.
    return item ? buildInlineReferences([item], language)[0] : marker;
  }).trim();

  const missingReferences = buildInlineReferences(evidence, language).filter((reference) => !normalized.includes(reference));
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
};
