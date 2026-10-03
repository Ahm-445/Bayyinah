const {
  createLLMProvider,
} = require("../providers/llmProvider");

const {
  buildGenerationPrompt,
} = require("../prompts/generationPrompt");

const {
  createDraft,
} = require("../contracts/draftContract");

const { buildCitations } = require("../rag/citation/citationBuilder");

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

    const answerWithSourceNotice = preserveEnglishTafsirNotice(
      answer,
      language,
      evidence
    );
    const citations = buildCitations(evidence);

    return createDraft({
      answer: answerWithSourceNotice,
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
};
