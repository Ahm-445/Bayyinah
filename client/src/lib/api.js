async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "The Bayyinah service could not complete this request.");
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return payload;
}

export function submitQuestion({ questionId, text, language }) {
  return request(`/api/questions/${encodeURIComponent(questionId)}/ai-answer`, {
    method: "POST",
    body: JSON.stringify({ text, language }),
  });
}

export function getReviewQueue() {
  return request("/api/review/drafts");
}

export function decideDraft({ draftId, decision, acknowledgeWarnings = false }) {
  return request(`/api/review/drafts/${encodeURIComponent(draftId)}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, acknowledgeWarnings }),
  });
}

export function getPublishedAnswer(questionId) {
  return request(`/api/questions/${encodeURIComponent(questionId)}/published-answer`);
}
