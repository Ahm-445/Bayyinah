import assert from 'node:assert/strict'
import test from 'node:test'
import { canPublishAIResult, getAIAction, getOutcome, requiresAcknowledgement } from './aiResult.js'

const nonAnswers = ['CLARIFY', 'ABSTAIN', 'REFER']

test('all AI actions have a distinct non-published seeker outcome without requiring draft fields', () => {
  for (const aiAction of nonAnswers) {
    const result = { aiAction, classification: null, safety: { decision: 'REVIEW', reason: 'Needs human review.' }, evidence: [], draft: null, verification: null, published: false }
    assert.equal(getAIAction(result), aiAction)
    assert.notEqual(getOutcome(result).tone, 'success')
    assert.equal(canPublishAIResult(result), false)
  }
})

test('only verified ANSWER drafts can be published and review flags are null-safe', () => {
  const answer = { aiAction: 'ANSWER', action: 'ANSWER', draftStatus: 'pending_review', published: false, safety: { decision: 'ALLOW' }, draft: { answer: 'A sourced answer.' }, verification: { status: 'PASS' } }
  assert.equal(getOutcome(answer).tone, 'success')
  assert.equal(canPublishAIResult(answer), true)
  assert.equal(canPublishAIResult({ ...answer, verification: null }), false)
  assert.equal(canPublishAIResult({ ...answer, safety: { decision: 'BLOCK' } }), false)
  assert.equal(requiresAcknowledgement({ safety: null, verification: null }), false)
  assert.equal(requiresAcknowledgement({ verification: { warnings: ['Check source'] } }), true)
})
