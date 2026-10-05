import { isCitedIn } from '../../shared/lib/references.js'

/**
 * Same rule as the backend (server/src/services/draftPolicy.js): approving
 * needs acknowledgeWarnings when the AI could not fully back the draft.
 */
export function needsAcknowledgement({ aiAction, safety, classification, verification }) {
  if (aiAction !== 'ANSWER') return true // REFER, ABSTAIN, CLARIFY
  if (classification?.level === 'D') return true
  if (safety?.decision && safety.decision !== 'ALLOW') return true
  if (!verification) return true
  if (verification.status !== 'PASS') return true
  if ((verification.warnings ?? []).length > 0) return true
  if ((verification.riskFlags ?? []).length > 0) return true
  return false
}

/**
 * Published citations come from the final text (docs/api.md 4): a verse is
 * cited when "surah:ayah" appears in it, other sources when their reference does.
 */
export function citationsFromText(text, evidence) {
  return evidence
    .filter((item) => isCitedIn(text, { ...item, ...item.citation }))
    .map((item) => ({
      sourceId: item.sourceId,
      chunkId: item.chunkId,
      sourceTitle: item.citation?.sourceTitle ?? null,
      reference: item.citation?.reference ?? null,
    }))
}

/**
 * One draft per dāʿī from an AI result, as the backend's questionProcessor
 * builds it: always `in_review` (the AI never blocks), `text` = the AI draft
 * or "" when there is none.
 */
export function draftFromResult({ id, question, result, daeeId, createdAt }) {
  const generatedText = result.draft?.answer ?? null
  return {
    id,
    status: 'in_review',
    question: {
      id: question.id,
      text: question.text,
      language: question.language,
      classification: {
        category: result.classification?.category ?? null,
        level: result.classification?.level ?? null,
        risk: result.classification?.risk ?? null,
      },
    },
    aiAction: result.aiAction,
    safety: result.safety,
    generatedText,
    text: generatedText ?? '',
    versions: generatedText ? [{ text: generatedText, editedAt: createdAt, editedBy: null }] : [],
    evidence: result.evidence ?? [],
    citations: result.draft?.citations ?? [],
    verification: result.verification ?? null,
    requiresAcknowledgement: needsAcknowledgement(result),
    _daeeId: daeeId,
    _createdAt: createdAt,
  }
}
