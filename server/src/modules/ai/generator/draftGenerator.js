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
  if (!matches) throw new Error("Generated draft does not match the question language");
}

function addEvidenceReferences(answer, evidence, language) {
  const verseEvidence = evidence.filter((item) => {
    const citation = item.citation || {};
    return ["quran", "tafsir", "translation"].includes(citation.sourceType || citation.category) &&
      Number.isInteger(citation.surahNumber) && Number.isInteger(citation.ayahNumber);
  });
  const knownVerseKeys = new Set(verseEvidence.map(({ citation }) => `${citation.surahNumber}:${citation.ayahNumber}`));
  const nonVerseLabels = evidence.filter((item) => !verseEvidence.includes(item)).flatMap(({ citation = {} }) => [citation.reference, citation.sourceTitle].filter(Boolean));

  let normalized = answer.replace(/\(([^()]*?\d{1,3}\s*:\s*\d{1,3}[^()]*)\)/gu, (marker) => {
    if (!knownVerseKeys.size || nonVerseLabels.some((label) => marker.includes(label))) return marker;
    const match = marker.match(/(\d{1,3})\s*:\s*(\d{1,3})/u);
    const key = `${Number(match[1])}:${Number(match[2])}`;
    if (!knownVerseKeys.has(key)) throw new Error("Generated Quran reference is not present in the evidence");
    const item = verseEvidence.find(({ citation }) => `${citation.surahNumber}:${citation.ayahNumber}` === key);
    return buildInlineReferences([item], language)[0];
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

    const answer = await llm.generate(prompt, {
      model,
      temperature: 0.2,
      maxOutputTokens: 1200,
      taskType: "draft_generation",
    });

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
  }

  return {
    generateDraft,
  };
}

module.exports = {
  createDraftGenerator,
  ENGLISH_ARABIC_TAFSIR_NOTICE,
  preserveEnglishTafsirNotice,
  assertDraftLanguage,
  addEvidenceReferences,
};
