/**
 * Bayyinah AI Contracts
 *
 * This file defines the shared data shapes used inside
 * the AI module.
 *
 * Important:
 * These are application-level contracts, not MongoDB schemas.
 */

/**
 * Question levels based on the approved scientific reference package.
 *
 * A: معلومات أصلية مستقرة
 * B: شرح وتعريف واستدلال
 * C: مسائل خلافية أو عالية الحساسية
 * D: فتوى أو حالة شخصية
 */
const QUESTION_LEVELS = Object.freeze({
  A: "A",
  B: "B",
  C: "C",
  D: "D",
});

/**
 * Actions the AI pipeline may recommend for a question.
 */
const AI_ACTIONS = Object.freeze({
  ANSWER: "ANSWER",
  CLARIFY: "CLARIFY",
  ABSTAIN: "ABSTAIN",
  REFER: "REFER",
});

/**
 * Risk levels used by the AI safety layer.
 */
const RISK_LEVELS = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

/**
 * Verification status.
 */
const VERIFICATION_STATUS = Object.freeze({
  PASS: "PASS",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  FAIL: "FAIL",
});

/**
 * High-level question categories.
 *
 * These categories are based on the content areas represented
 * in the approved scientific reference package.
 */
const QUESTION_CATEGORIES = Object.freeze({
  GENERAL_ISLAM: "general_islam",
  QURAN: "quran",
  HADITH: "hadith",
  TAFSIR: "tafsir",
  AQEEDAH: "aqeedah",
  FIQH: "fiqh",
  SEERAH_HISTORY: "seerah_history",
  OBJECTIONS: "objections",
  TERMINOLOGY: "terminology",
  TRANSLATION: "translation",
  OTHER: "other",
});

/**
 * Input received by the AI pipeline.
 *
 * @typedef {Object} QuestionInput
 * @property {string} questionId
 * @property {string} text
 * @property {string} language
 */

/**
 * Result produced by the question classifier.
 *
 * @typedef {Object} ClassificationResult
 * @property {string} category
 * @property {string} level
 * @property {string} risk
 * @property {string} action
 * @property {string[]} reasons
 */

/**
 * Evidence retrieved from the approved knowledge base.
 *
 * @typedef {Object} Evidence
 * @property {string} sourceId
 * @property {string} chunkId
 * @property {string} text
 * @property {number} score
 * @property {Object} citation
 */

/**
 * AI-generated draft.
 *
 * This is NOT a published answer.
 * It must be reviewed by the Da'i before publication.
 *
 * @typedef {Object} Draft
 * @property {string} answer
 * @property {string} language
 * @property {Object[]} citations
 */

/**
 * Verification result for a generated draft.
 *
 * @typedef {Object} VerificationResult
 * @property {string} status
 * @property {boolean} citationValid
 * @property {boolean} evidenceSupported
 * @property {string[]} unsupportedClaims
 * @property {string[]} missingCitations
 * @property {string[]} riskFlags
 * @property {string[]} warnings
 */

/**
 * Final structured result returned by the AI pipeline.
 *
 * @typedef {Object} AIResult
 * @property {string} action
 * @property {ClassificationResult} classification
 * @property {Evidence[]} evidence
 * @property {Draft|null} draft
 * @property {VerificationResult|null} verification
 */

module.exports = {
  QUESTION_LEVELS,
  AI_ACTIONS,
  RISK_LEVELS,
  VERIFICATION_STATUS,
  QUESTION_CATEGORIES,
};