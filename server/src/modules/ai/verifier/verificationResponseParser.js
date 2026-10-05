const { evidenceId, organizeEvidenceForVerification } = require("./evidenceOrganizer");
const { extractDraftSpans } = require("./draftSpanExtractor");

// Quotation marks of any script. The straight apostrophe is left out: it is an
// ordinary letter in English contractions and transliterations ("Qur'an").
const QUOTATION = /["“”„«»‹›「」『』]|‘[^’]*’/u;
// Any parenthetical source reference: "(Al-Baqarah 2:163)", "(Sahih al-Bukhari 7270)".
const PARENTHETICAL_REFERENCE = /\([^()]*\d[^()]*\)/u;
// Words attributed to Allah, the Prophet ﷺ, a verse, a hadith or a named source.
const ATTRIBUTION = new RegExp([
  "قال\\s+(?:الله|تعالى|رسول|النبي|صلى)", "يقول\\s+(?:الله|تعالى)", "قوله\\s+تعالى",
  "ﷺ", "صلى الله عليه وسلم", "رواه", "في\\s+الحديث", "حديث", "الآية", "سورة",
  "\\b(?:allah|god)\\s+(?:says|said|states|tells)", "\\b(?:the\\s+)?prophet\\b.*\\b(?:said|says|taught)",
  "\\b(?:quran|qur'an|hadith|verse|surah|narrated|reported)\\b",
].join("|"), "iu");
// Statements of a religious ruling.
const RULING = new RegExp([
  "يجب", "واجب", "فرض", "حرام", "محرم", "يحرم", "حلال", "يجوز", "مباح", "مكروه", "مستحب",
  "\\b(?:must|obligatory|obligation|forbidden|prohibited|haram|halal|permissible|impermissible|allowed|not\\s+allowed|required|fard|wajib|makruh)\\b",
].join("|"), "iu");

/**
 * An unsupported sentence that may be downgraded to a warning: plain
 * explanatory prose, not a quotation, citation, attribution or ruling.
 * Anything else that the evidence does not support stays a failure.
 */
function isPlainSentence(claim) {
  return !QUOTATION.test(claim) && !PARENTHETICAL_REFERENCE.test(claim) &&
    !ATTRIBUTION.test(claim) && !RULING.test(claim);
}

/**
 * Parses internal claim-level model output and normalizes it to the existing
 * application verification shape.
 *
 * @param {string} response
 * @param {{draft: string, evidence: Object[]}} context
 * @returns {Object}
 */
function parseVerificationResponse(response, { question, draft, evidence = [] } = {}) {
  if (typeof response !== "string" || !response.trim()) {
    throw new Error("Verification response is required");
  }
  if (typeof draft !== "string") throw new Error("Draft is required to validate extracted claims");
  if (!Array.isArray(evidence)) throw new Error("Evidence must be an array");

  let parsed;
  try {
    parsed = JSON.parse(response);
  } catch (_error) {
    throw new Error("Verification response must be valid JSON");
  }
  if (!Array.isArray(parsed.claims)) throw new Error("claims must be an array");
  if (!Array.isArray(parsed.warnings ?? [])) throw new Error("warnings must be an array");
  if (!Array.isArray(parsed.riskFlags ?? [])) throw new Error("riskFlags must be an array");

  const spans = extractDraftSpans(draft);
  const evidenceOrder = organizeEvidenceForVerification(question || "", evidence);
  const orderedEvidence = evidenceOrder.target && evidenceOrder.focusedEvidence.length
    ? [...evidenceOrder.focusedEvidence, ...evidenceOrder.otherEvidence]
    : evidence;
  const evidenceIds = orderedEvidence.map(evidenceId);
  const warnings = [...(parsed.warnings ?? [])];
  const unsupportedClaims = [];
  const claimAudits = [];
  const claimsBySpan = new Map();
  let invalidExtraction = false;
  let everyClaimSupported = true;
  let supportedFactualClaims = 0;
  const unsupported = [];

  for (const claimResult of parsed.claims) {
    if (
      !claimResult || typeof claimResult !== "object" ||
      !Number.isInteger(claimResult.draftSpan) ||
      typeof claimResult.factual !== "boolean" ||
      typeof claimResult.supported !== "boolean" ||
      !Array.isArray(claimResult.supportingEvidence) ||
      claimResult.supportingEvidence.some((id) => !Number.isInteger(id)) ||
      typeof claimResult.reason !== "string"
    ) {
      throw new Error("Each claim must contain draftSpan, factual, supportingEvidence, supported, and reason fields");
    }

    if (claimResult.draftSpan < 1 || claimResult.draftSpan > spans.length || claimsBySpan.has(claimResult.draftSpan)) {
      invalidExtraction = true;
      everyClaimSupported = false;
      warnings.push("Verifier returned an invalid or duplicate draft-span reference; manual review is required.");
      continue;
    }
    claimsBySpan.set(claimResult.draftSpan, claimResult);
  }

  if (claimsBySpan.size !== spans.length) {
    invalidExtraction = true;
    everyClaimSupported = false;
    warnings.push("Verifier did not classify every draft span; manual review is required.");
  }

  for (const [index, claimResult] of [...claimsBySpan.entries()].sort(([a], [b]) => a - b)) {
    const claim = spans[index - 1];
    if (!claimResult.factual) {
      claimAudits.push({ draftClaim: claim, factual: false, supportingEvidence: [], supported: true, reason: "" });
      continue;
    }

    const referencesAreKnown = claimResult.supportingEvidence.every((number) => number >= 1 && number <= evidenceIds.length);
    const supportingEvidence = referencesAreKnown
      ? [...new Set(claimResult.supportingEvidence)].map((number) => evidenceIds[number - 1])
      : [];
    const supported = claimResult.supported && referencesAreKnown && supportingEvidence.length > 0;
    claimAudits.push({
      draftClaim: claim,
      factual: true,
      supportingEvidence,
      supported,
      reason: claimResult.reason.trim(),
    });
    if (supported) {
      supportedFactualClaims += 1;
    } else {
      const reason = claimResult.reason.trim() ||
        (claimResult.supported && !referencesAreKnown
          ? "The verifier selected an evidence number that was not supplied for this answer."
          : claimResult.supported
            ? "No supporting evidence was identified for this claim."
            : "The supplied evidence does not support this claim.");
      unsupported.push({ claim, reason, plain: referencesAreKnown && isPlainSentence(claim) });
    }
  }

  // One unsupported plain sentence (e.g. a closing paraphrase) in an otherwise
  // supported draft is a warning for the Da'i (NEEDS_REVIEW), not a failure.
  // Quotations, citations, attributions, rulings, a second unsupported claim,
  // or a draft with no supported claim at all still fail.
  const reviewOnly = !invalidExtraction && unsupported.length === 1 &&
    unsupported[0].plain && supportedFactualClaims > 0;
  if (reviewOnly) {
    const [{ claim, reason }] = unsupported;
    warnings.push(`Unsupported sentence, review before publishing: "${claim}" — ${reason}`);
  } else if (unsupported.length) {
    everyClaimSupported = false;
    for (const { claim, reason } of unsupported) unsupportedClaims.push(`Draft claim: "${claim}" — ${reason}`);
  }

  if (invalidExtraction) everyClaimSupported = false;

  return {
    evidenceSupported: everyClaimSupported,
    unsupportedClaims,
    warnings,
    riskFlags: parsed.riskFlags ?? [],
    claimAudits,
  };
}

module.exports = {
  parseVerificationResponse,
  isPlainSentence,
};
