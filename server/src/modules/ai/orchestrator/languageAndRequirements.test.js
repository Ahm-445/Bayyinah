const assert = require("node:assert/strict");
const test = require("node:test");
const { createAIOrchestrator } = require("./aiOrchestrator");
const { detectRequiredSourceTypes } = require("../classifier/sourceRequirements");

function createOrchestrator({ evidence, draftLanguage }) {
  const calls = { retrievalOptions: null, generation: 0, generatedLanguage: null };
  const orchestrator = createAIOrchestrator({
    retriever: {
      async retrieve(_question, options) {
        calls.retrievalOptions = options;
        return evidence;
      },
    },
    draftGenerator: {
      async generateDraft({ language }) {
        calls.generation += 1;
        calls.generatedLanguage = language;
        return { answer: "A supported draft.", language: draftLanguage || language, citations: [] };
      },
    },
    citationVerifier: {
      verifyCitations() {
        return { status: "PASS", citationValid: true, evidenceSupported: true, missingCitations: [] };
      },
    },
    evidenceVerifier: {
      async verify() {
        return { status: "PASS", citationValid: true, evidenceSupported: true, unsupportedClaims: [] };
      },
    },
  });
  return { orchestrator, calls };
}

const quranEvidence = {
  sourceId: "quranpedia-quran-hafs",
  chunkId: "quran-hafs-112-1",
  text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
  score: 0.9,
  citation: { category: "quran", sourceType: "quran", language: "ar" },
};
const hadithEvidence = {
  sourceId: "ahmedbaset-hadith-bukhari",
  chunkId: "ahmedbaset-hadith-bukhari-1",
  text: "Arabic hadith text",
  score: 0.9,
  citation: { category: "hadith", sourceType: "hadith", language: "ar-en" },
};
const tafsirEvidence = {
  sourceId: "quranpedia-tafsir-book-1",
  chunkId: "tafsir-fatihah-1",
  text: "Arabic tafsir text",
  score: 0.9,
  citation: { category: "tafsir", sourceType: "tafsir", language: "ar", reference: "Quran 1:1-1:7" },
};

test("Arabic question language is detected and controls draft language", async () => {
  const { orchestrator, calls } = createOrchestrator({ evidence: [quranEvidence] });
  const result = await orchestrator.processQuestion({
    questionId: "arabic-language-test",
    text: "ماذا يقول القرآن عن التوحيد؟",
    language: "en", // Conflicting legacy/UI hint must not override the question.
  });
  assert.equal(result.classification.language, "ar");
  assert.equal(calls.generatedLanguage, "ar");
  assert.deepEqual(calls.retrievalOptions.sourceLanguages, ["ar", "en"]);
});

test("English tafsir meaning questions route to tafsir and request tafsir evidence", async () => {
  const { orchestrator, calls } = createOrchestrator({ evidence: [tafsirEvidence] });
  const result = await orchestrator.processQuestion({
    questionId: "english-tafsir-routing-test",
    text: "What does the beginning of Surah Al-Fatihah mean?",
  });
  assert.equal(result.classification.language, "en");
  assert.equal(result.classification.category, "tafsir");
  assert.deepEqual(calls.retrievalOptions.requiredSourceTypes, ["tafsir"]);
  assert.equal(calls.generatedLanguage, "en");
});

test("multi-source intent requires Quran and hadith before generation", async () => {
  const { orchestrator, calls } = createOrchestrator({ evidence: [quranEvidence] });
  const result = await orchestrator.processQuestion({
    questionId: "missing-hadith-required-source-test",
    text: "Explain the importance of Tawhid using the Quran and a hadith.",
  });
  assert.equal(result.classification.category, "aqeedah");
  assert.deepEqual(calls.retrievalOptions.requiredSourceTypes, ["quran", "hadith"]);
  assert.equal(result.action, "ABSTAIN");
  assert.equal(result.safety.decision, "REVIEW");
  assert.match(result.safety.reason, /hadith/i);
  assert.equal(calls.generation, 0);
});

test("multi-source request proceeds when each required source type is present", async () => {
  const { orchestrator, calls } = createOrchestrator({ evidence: [quranEvidence, hadithEvidence] });
  const result = await orchestrator.processQuestion({
    questionId: "complete-multi-source-test",
    text: "Explain the importance of Tawhid using the Quran and a hadith.",
  });
  assert.equal(result.action, "ANSWER");
  assert.equal(calls.generation, 1);
});

test("Arabic explicit verse and hadith request requires both source types", () => {
  assert.deepEqual(detectRequiredSourceTypes("اذكر آية وحديثًا عن الصبر."), ["quran", "hadith"]);
  assert.deepEqual(detectRequiredSourceTypes("اذكر آيات القرآن الكريم عن الصبر"), ["quran"]);
  assert.deepEqual(detectRequiredSourceTypes("اذكر نص قرآني عن الصبر"), ["quran"]);
  assert.deepEqual(detectRequiredSourceTypes("ما معنى التوحيد؟"), []);
  assert.deepEqual(detectRequiredSourceTypes("اذكر حديثًا عن الصبر"), ["hadith"]);
});

test("Arabic Quran and hadith request abstains before generation when Quran evidence is missing", async () => {
  const { orchestrator, calls } = createOrchestrator({ evidence: [hadithEvidence] });
  const result = await orchestrator.processQuestion({
    questionId: "arabic-missing-quran-required-source-test",
    text: "اذكر آية وحديثًا عن الصبر.",
  });
  assert.deepEqual(calls.retrievalOptions.requiredSourceTypes, ["quran", "hadith"]);
  assert.equal(result.action, "ABSTAIN");
  assert.match(result.safety.reason, /Required Quran evidence is missing/);
  assert.equal(calls.generation, 0);
});

test("Arabic Quran and hadith request proceeds only with sufficient evidence for both", async () => {
  const { orchestrator, calls } = createOrchestrator({ evidence: [quranEvidence, hadithEvidence] });
  const result = await orchestrator.processQuestion({
    questionId: "arabic-complete-quran-hadith-test",
    text: "اذكر آية وحديثًا عن الصبر.",
  });
  assert.equal(result.action, "ANSWER");
  assert.equal(calls.generation, 1);
});
