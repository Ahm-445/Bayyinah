const assert = require("node:assert/strict");
const test = require("node:test");
const { buildVerificationPrompt } = require("../prompts/verificationPrompt");
const { createEvidenceVerifierService } = require("./evidenceVerifierService");
const { organizeEvidenceForVerification } = require("./evidenceOrganizer");

const tawhidEvidence = [
  { sourceId: "source-a", chunkId: "a-1", text: "Allah alone is worthy of worship and obedience.", score: 0.55, citation: { sourceType: "quran" } },
  { sourceId: "source-b", chunkId: "b-1", text: "Allah is One.", score: 0.99, citation: { sourceType: "quran" } },
];

function record(draftSpan, { factual = true, supported = true, supportingEvidence = [], reason = "" } = {}) {
  return { draftSpan, factual, supportingEvidence, supported, reason };
}

function verifyWith({ answer, evidence, claims, question = "Question?", warnings = [], riskFlags = [] }) {
  const calls = { count: 0, promptInput: null };
  const service = createEvidenceVerifierService({
    async verify(input) {
      calls.count += 1;
      calls.promptInput = input;
    return JSON.stringify({ claims, warnings, riskFlags });
    },
  }, { onClaimAudit(audit) { calls.claimAudits = audit; } });
  return service.verify({ question, draft: { answer }, evidence }).then((result) => ({ result, calls }));
}

test("claim-level verifier makes one call and asks for per-claim exact evidence references", async () => {
  const { result, calls } = await verifyWith({
    question: "What does Tawhid mean?",
    answer: "Tawhid means affirming that Allah is One and worshipping Him alone.",
    evidence: tawhidEvidence,
    claims: [record(1, { supportingEvidence: [1, 2] })],
  });
  assert.equal(calls.count, 1);
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.unsupportedClaims, []);
  assert.deepEqual(calls.claimAudits[0].supportingEvidence, ["source-a:a-1", "source-b:b-1"]);
});

test("direct support is accepted", async () => {
  const answer = "Allah is One.";
  const { result } = await verifyWith({ answer, evidence: tawhidEvidence, claims: [record(1, { supportingEvidence: [2] })] });
  assert.equal(result.evidenceSupported, true);
});

test("faithful paraphrase is accepted without an exact-wording requirement", async () => {
  const answer = "He alone deserves worship and obedience.";
  const prompt = buildVerificationPrompt({ question: "Question?", draft: answer, evidence: tawhidEvidence });
  assert.match(prompt, /faithful paraphrase/i);
  const { result } = await verifyWith({ answer, evidence: tawhidEvidence, claims: [record(1, { supportingEvidence: [1] })] });
  assert.equal(result.status, "PASS");
});

test("multi-evidence synthesis accepts supporting references from both chunks", async () => {
  const answer = "Tawhid means affirming that Allah is One and worshipping Him alone.";
  const { result } = await verifyWith({
    answer,
    evidence: tawhidEvidence,
    claims: [record(1, { supportingEvidence: [1, 2] })],
  });
  assert.equal(result.status, "PASS");
});

test("unsupported factual addition remains a failure", async () => {
  const answer = "Tawhid means Allah is One. Muslims must perform five daily prayers.";
  const { result } = await verifyWith({
    answer,
    evidence: tawhidEvidence,
    claims: [record(1, { supportingEvidence: [2] }), record(2, { supported: false, reason: "The evidence does not establish this obligation." })],
  });
  assert.equal(result.evidenceSupported, false);
  assert.equal(result.status, "FAIL");
  assert.match(result.unsupportedClaims[0], /five daily prayers/);
});

test("invented Quran verse without supporting Quran text fails", async () => {
  const answer = "قال الله تعالى: إن الصبر يفتح أبواب الرزق.";
  const { result } = await verifyWith({
    answer,
    evidence: tawhidEvidence,
    claims: [record(1, { supported: false, reason: "No supplied Quran text contains this verse." })],
  });
  assert.equal(result.status, "FAIL");
  assert.match(result.unsupportedClaims[0], /No supplied Quran text/);
});

test("invented hadith without supporting hadith evidence fails", async () => {
  const answer = "قال النبي ﷺ: من صبر نال كل ما تمنى.";
  const { result } = await verifyWith({
    answer,
    evidence: tawhidEvidence,
    claims: [record(1, { supported: false, reason: "No supplied hadith supports this attribution." })],
  });
  assert.equal(result.status, "FAIL");
  assert.match(result.unsupportedClaims[0], /hadith supports this attribution/);
});

test("an invalid model claim index cannot enter unsupportedClaims", async () => {
  const answer = "The tafsir explains praise and mercy.";
  const { result } = await verifyWith({
    answer,
    evidence: tawhidEvidence,
    claims: [record(99, { supported: false, reason: "Not in evidence." })],
  });
  assert.equal(result.status, "FAIL");
  assert.deepEqual(result.unsupportedClaims, []);
  assert.ok(result.warnings.some((warning) => /invalid or duplicate draft-span/.test(warning)));
});

test("omitted draft span fails closed instead of silently skipping a claim", async () => {
  const answer = "Allah is One. Muslims must pray five times a day.";
  const { result } = await verifyWith({
    answer,
    evidence: tawhidEvidence,
    claims: [record(1, { supportingEvidence: [2] })],
  });
  assert.equal(result.evidenceSupported, false);
  assert.ok(result.warnings.some((warning) => /did not classify every draft span/.test(warning)));
});

test("Fatiha evidence is presented as primary ahead of unrelated tafsir and scores are not used", () => {
  const evidence = [
    { sourceId: "taf", chunkId: "other-1", text: "Unrelated text", score: 0.99, citation: { sourceType: "tafsir", reference: "Quran 55:58–55:63" } },
    { sourceId: "taf", chunkId: "fatiha-1", text: "الحمد والمدح أخوان لفظا، ومعناهما الثناء الجميل", score: 0.72, citation: { sourceType: "tafsir", reference: "Quran 1:1–1:7" } },
  ];
  const { focusedEvidence, otherEvidence } = organizeEvidenceForVerification("ما تفسير بداية سورة الفاتحة؟", evidence);
  assert.deepEqual(focusedEvidence.map((item) => item.chunkId), ["fatiha-1"]);
  assert.deepEqual(otherEvidence.map((item) => item.chunkId), ["other-1"]);
  const prompt = buildVerificationPrompt({ question: "ما تفسير بداية سورة الفاتحة؟", draft: "هذا يوضح أن الحمد هو الثناء الجميل.", evidence });
  assert.ok(prompt.indexOf("fatiha-1") < prompt.indexOf("other-1"));
  assert.match(prompt, /scores are not truth/i);
});

test("materially altered المُلك والمِلك meaning is rejected", async () => {
  const answer = "المُلك والملك لهما نفس المعنى ولا يوجد فرق.";
  const { result } = await verifyWith({
    answer,
    evidence: [{ sourceId: "taf", chunkId: "distinction", text: "يفرق التفسير بين المُلك والمِلك", citation: { sourceType: "tafsir" } }],
    claims: [record(1, { supported: false, supportingEvidence: [1], reason: "The draft removes the distinction made by the source." })],
  });
  assert.equal(result.status, "FAIL");
});

test("English explanation label is supported by Arabic tafsir source metadata", async () => {
  const answer = "This is an English explanation of the Arabic tafsir source, not a quotation of its original wording.";
  const evidence = [{
    sourceId: "taf",
    chunkId: "fatiha-1",
    text: "الحمد والمدح أخوان لفظا، ومعناهما الثناء الجميل",
    citation: { sourceType: "tafsir", language: "ar", reference: "Quran 1:1–1:7" },
  }];
  const { result } = await verifyWith({
    question: "What does the beginning of Surah Al-Fatihah mean?",
    answer,
    evidence,
    claims: [record(1, { supportingEvidence: [1] })],
  });
  assert.equal(result.status, "PASS");
});

const { combineVerificationResults } = require("./verificationCombiner");
const prayerEvidence = [
  { sourceId: "quran", chunkId: "quran-hafs-11-114", text: "وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ", citation: { sourceType: "quran", surahNumber: 11, ayahNumber: 114 } },
  { sourceId: "hadith", chunkId: "bukhari-528", text: "The five prayers wipe away sins as a river washes away dirt.", citation: { sourceType: "hadith", reference: "Sahih al-Bukhari 528" } },
];
const combined = (result) => combineVerificationResults({
  citationVerification: { citationValid: true, unsupportedClaims: [], missingCitations: [], riskFlags: [], warnings: [] },
  evidenceVerification: result,
});

test("one unsupported closing paraphrase in a supported draft needs review instead of failing", async () => {
  const answer = [
    "Allah commands prayer at both ends of the day and in part of the night: \"وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ\" (Hud 11:114).",
    "The Prophet ﷺ compared the five prayers to a river that washes away dirt (Sahih al-Bukhari 528).",
    "In this way prayer shapes the rhythm of a believer's whole day.",
  ].join(" ");
  const { result } = await verifyWith({
    question: "Why do Muslims pray five times a day?",
    answer,
    evidence: prayerEvidence,
    claims: [
      record(1, { supportingEvidence: [1] }),
      record(2, { supportingEvidence: [2] }),
      record(3, { supported: false, reason: "The evidence does not say this." }),
    ],
  });
  assert.equal(result.status, "NEEDS_REVIEW");
  assert.equal(result.evidenceSupported, true);
  assert.deepEqual(result.unsupportedClaims, []);
  assert.ok(result.warnings.some((warning) => /review before publishing: "In this way prayer shapes/.test(warning)));
  assert.equal(combined(result).status, "NEEDS_REVIEW");
});

test("unsupported quotations, citations, attributions, rulings or two unsupported sentences still fail", async () => {
  const supported = "Allah commands prayer at both ends of the day (Hud 11:114).";
  for (const bad of [
    "The verse says \"pray five times\".",                    // quotation
    "Prayer was made obligatory on the Night Journey (Al-Isra 17:1).", // citation the evidence doesn't support
    "The Prophet ﷺ said that prayer is the key to Paradise.",   // attribution
    "قال الله تعالى إن الصلاة تنهى عن كل شيء.",                 // attribution (Arabic)
    "Muslims must pray even when travelling.",                  // ruling
  ]) {
    const { result } = await verifyWith({
      answer: `${supported} ${bad}`,
      evidence: prayerEvidence,
      claims: [record(1, { supportingEvidence: [1] }), record(2, { supported: false, reason: "Not in the evidence." })],
    });
    assert.equal(result.status, "FAIL", bad);
    assert.equal(combined(result).status, "FAIL", bad);
  }

  const { result: twoUnsupported } = await verifyWith({
    answer: `${supported} Prayer brings calm. It also builds community.`,
    evidence: prayerEvidence,
    claims: [record(1, { supportingEvidence: [1] }), record(2, { supported: false }), record(3, { supported: false })],
  });
  assert.equal(twoUnsupported.status, "FAIL");
  assert.equal(twoUnsupported.unsupportedClaims.length, 2);

  const { result: nothingSupported } = await verifyWith({
    answer: "Prayer brings calm.",
    evidence: prayerEvidence,
    claims: [record(1, { supported: false })],
  });
  assert.equal(nothingSupported.status, "FAIL");
});
