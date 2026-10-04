/**
 * Product rule: the AI never blocks the dāʿī. Anything the AI could not
 * fully back up only makes the dāʿī confirm responsibility before publishing.
 *
 * Returns true when publishing needs `acknowledgeWarnings: true`.
 */
function needsAcknowledgement({
  aiAction,
  safety,
  classification,
  verification,
}) {
  if (aiAction !== "ANSWER") return true; // REFER, ABSTAIN, CLARIFY
  if (classification?.level === "D") return true;
  if (safety?.decision && safety.decision !== "ALLOW") return true;
  if (!verification) return true;
  if (verification.status !== "PASS") return true;
  if ((verification.warnings || []).length > 0) return true;
  if ((verification.riskFlags || []).length > 0) return true;

  return false;
}

module.exports = { needsAcknowledgement };
