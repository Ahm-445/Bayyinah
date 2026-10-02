function formatEvidenceItem(item, index) {
  const citation = item.citation || {};
  const fields = [
    ["Source", citation.sourceTitle || citation.title],
    ["URL", citation.sourceUrl || citation.url || citation.source],
    ["Source type", citation.sourceType],
    ["Language", citation.language],
    ["Version", citation.version || citation.sourceVersion],
    ["License", citation.license],
    ["Usage basis", citation.usageBasis],
    ["Author", citation.author],
    ["Collection", citation.hadithCollection || citation.collection],
    ["Hadith number", citation.hadithNumber],
    ["Hadith grade", citation.hadithGrade || citation.grade],
    ["Grade source", citation.gradingSource],
    ["Volume", citation.volume],
    ["Page", citation.pageNumber ?? citation.page],
    ["Surah", citation.surahName || citation.surahNumber],
    ["Ayah", citation.ayahNumber],
    ["Reference", citation.reference],
  ]
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `${label}: ${value}`);

  return [
    `Evidence ${index + 1}:`,
    `Source ID: ${item.sourceId}`,
    `Chunk ID: ${item.chunkId}`,
    ...fields,
    `Text: ${item.text}`,
  ].join("\n");
}

function formatEvidence(evidence) {
  if (!Array.isArray(evidence)) {
    throw new Error("Evidence must be an array");
  }

  return evidence.map(formatEvidenceItem).join("\n\n");
}

module.exports = { formatEvidence };
