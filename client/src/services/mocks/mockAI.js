import { readableReference } from '../../shared/lib/references.js'
import { EVIDENCE, citationsFor } from './fixtures/evidence.js'

// Mirrors the backend's AI_MODE=mock (server/src/services/mockAI.js):
// personal → REFER, off-topic → ABSTAIN, otherwise ANSWER with a Qur'an verse
// referenced in the question's language. Plus one mock-only case so the UI's
// "failed" state can be exercised: "simulate failure" → the AI "times out".
const ARABIC = /[؀-ۿ]/
const PERSONAL = /\b(my|should i|can i|am i|fatwa)\b|هل يجوز لي|زوجتي|زوجي|طلاق|فتوى/i
const UNRELATED = /\b(python|javascript|football|recipe|bitcoin|weather)\b/i
const ONENESS = /\b(tawhid|one god|god|allah|unity)\b|توحيد|الله|إله/i
const FAILURE = /\bsimulate (a )?failure\b/i

const PASS = {
  status: 'PASS',
  citationValid: true,
  evidenceSupported: true,
  unsupportedClaims: [],
  missingCitations: [],
  riskFlags: [],
  warnings: [],
}

/** Throws (like an AI timeout) for the failure case; otherwise an AIResult. */
export function processQuestion({ text, language }) {
  if (FAILURE.test(text)) throw new Error('AI did not answer within AI_TIMEOUT_MS (mock)')
  const lang = ARABIC.test(text) ? 'ar' : language === 'ar' ? 'ar' : 'en'

  if (PERSONAL.test(text)) {
    return {
      aiAction: 'REFER',
      classification: { category: 'fiqh', level: 'D', risk: 'high' },
      safety: { decision: 'BLOCK', reason: 'Personal ruling (level D): refer to a qualified scholar.' },
      evidence: [],
      draft: null,
      verification: null,
    }
  }

  if (UNRELATED.test(text)) {
    return {
      aiAction: 'ABSTAIN',
      classification: { category: 'other', level: 'A', risk: 'low' },
      safety: { decision: 'REVIEW', reason: 'Retrieved evidence is insufficient for generation.' },
      evidence: [],
      draft: null,
      verification: null,
    }
  }

  const verse = ONENESS.test(text) ? EVIDENCE.ikhlas1 : EVIDENCE.dhariyat56
  const marker = readableReference(verse, lang)
  const answer =
    lang === 'ar'
      ? `[مسودة تجريبية] هذه مسودة نموذجية للسؤال: «${text}». ${marker}`
      : `[Mock draft] This is a placeholder AI draft for: "${text}". ${marker}`

  return {
    aiAction: 'ANSWER',
    classification: { category: 'aqeedah', level: 'A', risk: 'low' },
    safety: { decision: 'ALLOW', reason: 'Question is within approved scope.' },
    evidence: [verse],
    draft: { answer, language: lang, citations: citationsFor([verse]) },
    verification: PASS,
  }
}
