export function getAIAction(result) {
  return result?.aiAction || result?.action || null
}

export function getOutcome(result) {
  if (!result) return null
  const action = getAIAction(result)
  if (action === 'REFER') {
    return { tone: 'warning', title: 'Referred for qualified guidance', message: 'Bayyinah did not prepare a normal answer for this request.' }
  }
  if (action === 'ABSTAIN') {
    return { tone: 'warning', title: 'No answer was prepared', message: 'The evidence or verification checks did not support an answer. This result is available for Da‘i review and is not published.' }
  }
  if (action === 'CLARIFY') {
    return { tone: 'warning', title: 'More detail is needed', message: 'Please clarify the question before an answer can be prepared.' }
  }
  if (result.safety?.decision === 'BLOCK') {
    return { tone: 'danger', title: 'This request was blocked', message: 'The safety review did not allow an answer. Nothing was sent for publication.' }
  }
  if (action !== 'ANSWER' || result.draftStatus !== 'pending_review' || result.published !== false) {
    return { tone: 'warning', title: 'No publishable draft is available', message: 'The result has not entered Da‘i review and is not published.' }
  }
  if (result.verification?.status === 'FAIL') {
    return { tone: 'danger', title: 'Verification failed', message: 'This draft cannot be reviewed for publication.' }
  }
  return { tone: 'success', title: 'AI draft ready for Da‘i review', message: 'This is a draft only. It has not been published.' }
}

export function canPublishAIResult(result) {
  return getAIAction(result) === 'ANSWER' &&
    typeof result?.draft?.answer === 'string' &&
    result.safety?.decision !== 'BLOCK' &&
    ['PASS', 'NEEDS_REVIEW'].includes(result.verification?.status);
}

export function requiresAcknowledgement(result) {
  return result?.safety?.decision === 'REVIEW' ||
    result?.verification?.status === 'NEEDS_REVIEW' ||
    (result?.verification?.warnings || []).length > 0 ||
    (result?.verification?.riskFlags || []).length > 0
}
