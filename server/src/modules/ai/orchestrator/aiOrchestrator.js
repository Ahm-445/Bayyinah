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
   * @param {string} input.language
   * @returns {Promise<Object>}
   */
  async function processQuestion({
    questionId,
    text,
    language,
    retrievalLanguages,
  }) {
    if (!questionId || typeof questionId !== "string") {
      throw new Error("questionId is required");
    }

    if (!text || typeof text !== "string") {
      throw new Error("Question text is required");
    }

    if (!language || typeof language !== "string") {
      throw new Error("Question language is required");
    }

    // 1. Classification
    const classification =
      classifyQuestion(text);

    // 2. Safety
    const safety =
      evaluateSafety(classification);

    const safetyDecision =
      handleSafetyDecision(safety);

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

    // 4. Retrieval
    const evidence =
      await retriever.retrieve(text, {
        category: classification.category,
        sourceLanguages: retrievalLanguages,
      });

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
    const draft =
      await draftGenerator.generateDraft({
        question: text,
        language,
        evidence,
      });

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
    const evidenceVerification =
      await evidenceVerifier.verify({
        question: text,
        draft,
        evidence,
      });

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
