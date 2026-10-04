const { formatEvidence } = require("../prompts/evidenceFormatter");

function requestedReference(question) {
  const surahMatch = question.match(/\b(?:surah|sura)\s+(\d{1,3})\b/i) ||
    question.match(/سورة\s*(\d{1,3})/u);
  let surahNumber = surahMatch ? Number(surahMatch[1]) : null;
  if (!surahNumber && /\b(?:al[- ]?)?fatihah\b|\bfatiha\b/i.test(question)) surahNumber = 1;
  if (!surahNumber && /الفاتحة/u.test(question)) surahNumber = 1;
  if (!surahNumber) return null;

  const ayahMatch = question.match(/\b(?:ayah|verse)\s*(\d{1,3})\b/i) ||
    question.match(/(?:الآية|اية|آية)\s*(\d{1,3})/u);
  return { surahNumber, ayahNumber: ayahMatch ? Number(ayahMatch[1]) : null };
}

function itemReferences(item) {
  const citation = item.citation || {};
  const references = Array.isArray(citation.references) ? citation.references : [];
  const normalized = references.map((reference) => ({
    surahNumber: Number(reference.surahNumber),
    ayahNumber: Number(reference.ayahNumber),
  })).filter((reference) => reference.surahNumber && reference.ayahNumber);
  if (normalized.length) return normalized;

  if (citation.surahNumber && citation.ayahNumber) {
    return [{ surahNumber: Number(citation.surahNumber), ayahNumber: Number(citation.ayahNumber) }];
  }

  const referenceText = String(citation.reference || "");
  const matches = [...referenceText.matchAll(/(?:Quran\s+)?(\d{1,3}):(\d{1,3})/gi)];
  return matches.map((match) => ({ surahNumber: Number(match[1]), ayahNumber: Number(match[2]) }));
}

function organizeEvidenceForVerification(question, evidence) {
  const target = requestedReference(question);
  if (!target) return { focusedEvidence: [], otherEvidence: evidence, target: null };

  const focusedEvidence = [];
  const otherEvidence = [];
  for (const item of evidence) {
    const references = itemReferences(item);
    const matches = references.some((reference) =>
      reference.surahNumber === target.surahNumber &&
      (target.ayahNumber === null || reference.ayahNumber === target.ayahNumber)
    );
    (matches ? focusedEvidence : otherEvidence).push(item);
  }

  if (focusedEvidence.length === 0) return { focusedEvidence: [], otherEvidence: evidence, target };
  return { focusedEvidence, otherEvidence, target };
}

function evidenceId(item) {
  return `${item.sourceId}:${item.chunkId}`;
}

function formatOrganizedEvidence(question, evidence) {
  const { focusedEvidence, otherEvidence, target } = organizeEvidenceForVerification(question, evidence);
  if (!target || focusedEvidence.length === 0) {
    const evidenceOrder = evidence;
    return { text: formatNumberedEvidence(evidenceOrder, evidenceOrder), evidenceIds: new Set(evidence.map(evidenceId)), evidenceOrder, target: null };
  }

  const label = target.ayahNumber === null
    ? `surah ${target.surahNumber}`
    : `surah ${target.surahNumber}, ayah ${target.ayahNumber}`;
  const evidenceOrder = [...focusedEvidence, ...otherEvidence];
  const sections = [
    `PRIMARY EVIDENCE MATCHING THE REQUESTED ${label.toUpperCase()}:\n\n${formatNumberedEvidence(focusedEvidence, evidenceOrder)}`,
  ];
  if (otherEvidence.length) {
    sections.push(`OTHER RETRIEVED EVIDENCE (SECONDARY; DO NOT LET UNRELATED ITEMS OVERRIDE SUPPORT FOUND ABOVE):\n\n${formatNumberedEvidence(otherEvidence, evidenceOrder)}`);
  }
  return {
    text: sections.join("\n\n"),
    evidenceIds: new Set(evidence.map(evidenceId)),
    evidenceOrder,
    target,
  };
}

function formatNumberedEvidence(items, evidenceOrder) {
  return items.map((item) => {
    const index = evidenceOrder.findIndex((candidate) => evidenceId(candidate) === evidenceId(item)) + 1;
    return `E${index}:\n${formatEvidence([item])}`;
  }).join("\n\n");
}

module.exports = {
  requestedReference,
  itemReferences,
  organizeEvidenceForVerification,
  formatOrganizedEvidence,
  formatNumberedEvidence,
  evidenceId,
};
