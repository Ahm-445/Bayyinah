/**
 * Splits a draft into deterministic source-verification spans. The verifier
 * selects span numbers rather than writing claim text, so it cannot invent a
 * claim that is absent from the answer.
 */
function extractDraftSpans(draft) {
  if (typeof draft !== "string") throw new Error("Draft is required");
  const spans = [];
  for (const line of draft.split(/\r?\n/u)) {
    const pieces = line.split(/(?<=[.!?؟])\s+/u);
    for (const piece of pieces) {
      const span = piece.trim();
      if (span) spans.push(span);
    }
  }
  return spans;
}

module.exports = { extractDraftSpans };
