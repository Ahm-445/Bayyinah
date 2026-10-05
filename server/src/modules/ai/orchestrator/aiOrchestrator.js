const {
  createAIResult,
} = require("../contracts/aiResultContract");

const {
  combineVerificationResults,
} = require("../verifier/verificationCombiner");

const {
  checkEvidenceSufficiency,
} = require("../rag/retrieval/evidenceSufficiency");

const {
  AI_ACTIONS,
} = require("../contracts/aiTypes");

const {
  classifyQuestion,
} = require("../classifier/questionClassifier");

const {
  evaluateSafety,
} = require("../safety/safetyGate");

const {
  handleSafetyDecision,
} = require("../safety/safetyDecisionHandler");
const { detectRequiredSourceTypes } = require("../classifier/sourceRequirements");

const SOURCE_TYPE_MATCHERS = Object.freeze({
  quran: new Set(["quran", "translation"]),
  hadith: new Set(["hadith"]),
  tafsir: new Set(["tafsir"]),
  translation: new Set(["translation"]),
});

/**
 * Creates the Bayyinah AI orchestrator.
 *
 * The orchestrator coordinates the AI pipeline.
 * It does not contain the implementation details of
 * classification, retrieval, generation, or verification.
 *
 * @param {Object} dependencies
 * @returns {Object}
 */
function createAIOrchestrator({
  retriever,
  draftGenerator,
  citationVerifier,
  evidenceVerifier,
}) {
  if (
    !retriever ||
    typeof retriever.retrieve !== "function"
  ) {
    throw new Error(
      "Retriever must implement retrieve()"
    );
  }

  if (
    !draftGenerator ||
    typeof draftGenerator.generateDraft !== "function"
  ) {
    throw new Error(
      "Draft generator must implement generateDraft()"
    );
  }

  if (
    !citationVerifier ||
    typeof citationVerifier.verifyCitations !==
      "function"
  ) {
    throw new Error(
      "Citation verifier must implement verifyCitations()"
    );
  }

  if (
    !evidenceVerifier ||
    typeof evidenceVerifier.verify !== "function"
  ) {
    throw new Error(
      "Evidence verifier must implement verify()"
    );
  }

  /**
   * Processes a question through the AI pipeline.
   *
   * @param {Object} input
   * @param {string} input.questionId
   * @param {string} input.text
   * @param {string} [input.language] Legacy caller hint; question language is detected from input.text.
   * @returns {Promise<Object>}
   */
  async function processQuestion({
    questionId,
    text,
    retrievalLanguages,
  }) {
    if (!questionId || typeof questionId !== "string") {
      throw new Error("questionId is required");
    }

    if (!text || typeof text !== "string") {
      throw new Error("Question text is required");
    }

    // 1. Classification
    const classification =
      classifyQuestion(text);

    // 2. Safety
    const safety =
      evaluateSafety(classification);

    const safetyDecision =
      handleSafetyDecision(safety);
    const explicitRequiredSourceTypes = detectRequiredSourceTypes(text);
    const requiredSourceTypes = explicitRequiredSourceTypes.length
      ? explicitRequiredSourceTypes
      : classification.category === "tafsir" ? ["tafsir"] : [];

    // 3. Block unsafe/personal requests
    if (!safetyDecision.shouldGenerate) {
      return createAIResult({
        action: safetyDecision.action,
        classification,
        safety,
        evidence: [],
        draft: null,
        verification: null,
      });
    }

    // Out-of-scope question: abstain without retrieval or a draft.
    if (classification.action === AI_ACTIONS.ABSTAIN) {
      return createAIResult({
        action: AI_ACTIONS.ABSTAIN,
        classification,
        safety,
        evidence: [],
        draft: null,
        verification: null,
      });
    }

    // 4. Retrieval
    const evidence =
      await retriever.retrieve(text, {
        category: classification.category,
        sourceLanguages: retrievalLanguages || ["ar", "en"],
        ...(requiredSourceTypes.length
          ? { requiredSourceTypes }
          : {}),
      });

    const insufficientRequiredSources = requiredSourceTypes.filter((requiredType) => {
      const sourceEvidence = evidence.filter((item) => SOURCE_TYPE_MATCHERS[requiredType]?.has(
        item.citation?.sourceType || item.citation?.category
      ));
      return !checkEvidenceSufficiency(sourceEvidence).sufficient;
    });
    if (insufficientRequiredSources.length) {
      const reason = insufficientRequiredSources.map((type) => {
        const hasAnyEvidence = evidence.some((item) => SOURCE_TYPE_MATCHERS[type]?.has(
          item.citation?.sourceType || item.citation?.category
        ));
        const typeLabel = type[0].toUpperCase() + type.slice(1);
        return hasAnyEvidence
          ? `Required ${typeLabel} evidence is insufficient.`
          : `Required ${typeLabel} evidence is missing.`;
      }).join(" ");
      return createAIResult({
        action: AI_ACTIONS.ABSTAIN,
        classification,
        safety: {
          ...safety,
          decision: "REVIEW",
          reason,
        },
        evidence,
        draft: null,
        verification: null,
      });
    }

    // 5. Evidence sufficiency
    const evidenceCheck =
    checkEvidenceSufficiency(evidence);

    if (!evidenceCheck.sufficient) {
    return createAIResult({
        action: AI_ACTIONS.ABSTAIN,
        classification,
        safety: {
        ...safety,
        decision: "REVIEW",
        reason:
            "Retrieved evidence is insufficient for generation.",
        },
        evidence,
        draft: null,
        verification: null,
    });
    }

    // 6. Generate draft
    let draft;
    try {
      draft = await draftGenerator.generateDraft({
        question: text,
        language: classification.language,
        evidence,
      });
    } catch (error) {
      // The result stays generic for the client, but the cause must be visible in the logs.
      console.error(`[ai] draft generation failed for question ${questionId}: ${error.message}`);
      return createAIResult({
        action: AI_ACTIONS.ABSTAIN,
        classification,
        safety: { ...safety, decision: "REVIEW", reason: "Answer generation failed; review is required." },
        evidence,
        draft: null,
        verification: null,
      });
    }

    // 7. Citation verification
    const citationVerification =
      await citationVerifier.verifyCitations(
        draft,
        evidence
      );

    if (
      citationVerification.status === "FAIL"
    ) {
      return createAIResult({
        action: AI_ACTIONS.ABSTAIN,
        classification,
        safety,
        evidence,
        draft,
        verification: citationVerification,
      });
    }

    // 8. Semantic evidence verification
    let evidenceVerification;
    try {
      evidenceVerification = await evidenceVerifier.verify({
        question: text,
        draft,
        evidence,
      });
    } catch (_error) {
      return createAIResult({
        action: AI_ACTIONS.ABSTAIN,
        classification,
        safety: { ...safety, decision: "REVIEW", reason: "Evidence verification failed; review is required." },
        evidence,
        draft,
        verification: null,
      });
    }

    const verification = combineVerificationResults({
  	citationVerification,
  	evidenceVerification,
	});

    return createAIResult({
      action:
        evidenceVerification.status === "FAIL"
          ? AI_ACTIONS.ABSTAIN
          : classification.action,
      classification,
      safety,
      evidence,
      draft,
      verification,
    });
  }

  return {
    processQuestion,
  };
}

module.exports = {
  createAIOrchestrator,
};
