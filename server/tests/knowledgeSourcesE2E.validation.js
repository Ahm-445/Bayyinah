require("dotenv").config();

const { connectMongo, closeMongo } = require("../src/modules/ai/rag/storage/mongoClient");
const { createVoyageEmbeddingProvider } = require("../src/modules/ai/providers/voyageEmbeddingProvider");
const { createRetriever } = require("../src/modules/ai/rag/retrieval/retriever");
const { createConfiguredLLMProvider } = require("../src/modules/ai/providers/llmProviderFactory");
const { createDraftGenerator } = require("../src/modules/ai/generator/draftGenerator");
const { verifyCitations } = require("../src/modules/ai/verifier/citationVerifier");
const { createSemanticVerificationProvider } = require("../src/modules/ai/verifier/semanticVerificationProvider");
const { createEvidenceVerifierService } = require("../src/modules/ai/verifier/evidenceVerifierService");
const { determineVerificationStatus } = require("../src/modules/ai/verifier/verificationRules");
const { createAIOrchestrator } = require("../src/modules/ai/orchestrator/aiOrchestrator");
const { checkEvidenceSufficiency } = require("../src/modules/ai/rag/retrieval/evidenceSufficiency");
const { detectRequiredSourceTypes } = require("../src/modules/ai/classifier/sourceRequirements");
const { detectLanguage } = require("../src/modules/ai/classifier/languageDetector");
const { SOURCE_ID: QURAN_SOURCE_ID } = require("../src/modules/ai/rag/ingestion/quran/quranChunkBuilder");
const { SOURCE_ID: TAFSIR_SOURCE_ID, SOURCE_URL: TAFSIR_SOURCE_URL } = require("../src/modules/ai/rag/ingestion/tafsir/tafsirChunkBuilder");
const { SOURCE_ID: TRANSLATION_SOURCE_ID } = require("../src/modules/ai/rag/ingestion/translations/saheehInternationalChunkBuilder");

const SOURCE_IDS = Object.freeze({
  quran: QURAN_SOURCE_ID,
  bukhari: "ahmedbaset-hadith-bukhari",
  muslim: "ahmedbaset-hadith-muslim",
  tafsir: TAFSIR_SOURCE_ID,
  saheehInternational: TRANSLATION_SOURCE_ID,
});
const SOURCES = Object.entries(SOURCE_IDS).map(([key, sourceId]) => ({ key, sourceId }));

const CASES = [
  { key: "quran_ar", question: "ماذا يقول القرآن عن الصبر وقت الشدائد؟", language: "ar", category: "quran", sourceTypes: ["quran"] },
  { key: "quran_en", question: "What does the Quran say about patience during difficult times?", language: "en", category: "quran", sourceTypes: ["quran"] },
  { key: "tawhid_ar", question: "ما معنى التوحيد في الإسلام؟", language: "ar", category: "aqeedah", sourceTypes: ["quran"] },
  { key: "tawhid_en", question: "What does Tawhid mean in Islam?", language: "en", category: "aqeedah", sourceTypes: ["quran"] },
  { key: "hadith_ar", question: "هل يمكنك أن تعطيني حديثًا عن النية؟", language: "ar", category: "hadith", sourceTypes: ["hadith"], crossLingual: false },
  { key: "hadith_en_cross_lingual", question: "Can you give me a hadith about intentions in Islam?", language: "en", category: "hadith", sourceTypes: ["hadith"], crossLingual: true },
  { key: "tafsir_ar", question: "ما تفسير بداية سورة الفاتحة؟", language: "ar", category: "tafsir", sourceTypes: ["tafsir"] },
  { key: "tafsir_en", question: "What does the beginning of Surah Al-Fatihah mean?", language: "en", category: "tafsir", sourceTypes: ["tafsir"] },
  { key: "quran_text_ar", question: "أعطني الآية الأولى من سورة الفاتحة", language: "ar", category: "quran", sourceTypes: ["quran"] },
  { key: "quran_text_en", question: "Show me the first verse of Al-Fatihah", language: "en", category: "quran", sourceTypes: ["quran"] },
  { key: "multi_source_ar", question: "اشرح لي أهمية التوحيد باستخدام القرآن وحديث", language: "ar", category: "aqeedah", sourceTypes: ["quran", "hadith"] },
  { key: "quran_hadith_patience_ar", question: "اذكر آية وحديثًا عن الصبر.", language: "ar", category: "quran", sourceTypes: ["quran", "hadith"] },
  { key: "multi_source_en", question: "Explain the importance of Tawhid using the Quran and a hadith.", language: "en", category: "aqeedah", sourceTypes: ["quran", "hadith"] },
  { key: "unrelated_python", question: "How do I write a Python REST API?", language: "en", category: "other", sourceTypes: [], abstainWithoutDraft: true },
  { key: "personal_ruling_ar", question: "أنا وزوجتي لدينا مشاكل زوجية، هل يجوز لي أن أطلقها؟", language: "ar", category: "fiqh", sourceTypes: [], action: "REFER", level: "D", noRetrieval: true },
  { key: "wife_requested_divorce_ar", question: "زوجتي طلبت الطلاق، ماذا أفعل شرعًا؟", language: "ar", category: "fiqh", sourceTypes: [], action: "REFER", level: "D", noRetrieval: true },
];

function requestedTypes(testCase, classification) {
  const explicit = detectRequiredSourceTypes(testCase.question);
  return explicit.length ? explicit : classification.category === "tafsir" ? ["tafsir"] : [];
}

function generatedLanguage(text) {
  if (!text) return null;
  const arabicLetters = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/gu) || []).length;
  const latinLetters = (text.match(/[A-Za-z]/g) || []).length;
  return arabicLetters > 0 && arabicLetters >= latinLetters ? "ar" : "en";
}

function evidenceSourceType(item) {
  return item.citation?.sourceType || item.citation?.category || "unknown";
}

function compactCitation(citation = {}) {
  const keys = [
    "sourceId", "chunkId", "sourceTitle", "title", "sourceUrl", "url", "sourceType", "category",
    "language", "languages", "approved", "version", "reference", "translator", "hadithCollection",
    "hadithNumber", "author", "volume", "pageNumber", "surahNumber", "surahName", "ayahNumber",
  ];
  return Object.fromEntries(keys.filter((key) => citation[key] !== undefined).map((key) => [key, citation[key]]));
}

function describeEvidence(item) {
  return {
    sourceId: item.sourceId,
    sourceType: evidenceSourceType(item),
    chunkId: item.chunkId,
    score: item.score,
    sourceMetadata: compactCitation(item.citation),
    // Exact prefix from the stored MongoDB chunk; the report truncates long chunks only.
    storedTextPrefix: item.text.length > 500 ? `${item.text.slice(0, 500)}…[truncated]` : item.text,
  };
}

function makeCaseReport(testCase, result, checks, pipelineCalls) {
  const evidenceSufficiency = result.safety.decision === "BLOCK"
    ? { status: "not run: safety blocked retrieval" }
    : checkEvidenceSufficiency(result.evidence);
  const requiredTypes = requestedTypes(testCase, result.classification);
  const presentTypes = new Set(result.evidence.map(evidenceSourceType));
  const missingRequiredTypes = requiredTypes.filter((type) => {
    if (type === "quran") return !["quran", "translation"].some((category) => presentTypes.has(category));
    return !presentTypes.has(type);
  });
  const citationVerification = checks.citation;
  const semanticVerification = checks.semantic ? {
    status: determineVerificationStatus({ citationValid: true, ...checks.semantic }),
    ...checks.semantic,
  } : null;
  const draftLanguage = result.draft ? generatedLanguage(result.draft.answer) : null;
  const englishTafsirLabelPassed = !(testCase.key === "tafsir_en" && result.draft) ||
    /^This is an English explanation of the original Arabic source, not an English source quotation\./i.test(result.draft.answer.trim());
  const expectedAction = testCase.action || "ANSWER";
  const classificationPassed = result.classification.language === testCase.language &&
    result.classification.category === testCase.category &&
    (!testCase.level || result.classification.level === testCase.level);
  const sourcesPassed = missingRequiredTypes.length === 0;
  const generationPassed = testCase.noRetrieval
    ? pipelineCalls.retrievalCalls === 0 && pipelineCalls.draftGenerationCalls === 0 && result.action === "REFER"
    : testCase.abstainWithoutDraft
      ? result.draft === null && pipelineCalls.draftGenerationCalls === 0 && result.action === "ABSTAIN"
      : result.action === expectedAction && result.draft !== null &&
        draftLanguage === testCase.language && citationVerification?.status === "PASS" &&
        semanticVerification?.status === "PASS";

  return {
    question: testCase.question,
    expectedLanguage: testCase.language,
    detectedLanguage: result.classification.language,
    category: result.classification.category,
    level: result.classification.level,
    risk: result.classification.risk,
    classifiedAction: result.classification.action,
    safetyDecision: result.safety.decision,
    safetyReason: result.safety.reason,
    crossLingual: testCase.crossLingual ?? false,
    requiredSourceTypes: requiredTypes,
    missingRequiredSourceTypes: missingRequiredTypes,
    retrievedSourceIds: [...new Set(result.evidence.map((item) => item.sourceId))],
    evidenceCount: result.evidence.length,
    topEvidenceScores: result.evidence.map((item) => ({
      sourceId: item.sourceId,
      sourceType: evidenceSourceType(item),
      chunkId: item.chunkId,
      reference: item.citation?.reference,
      language: item.citation?.language,
      score: item.score,
    })),
    evidenceSufficiency,
    evidence: result.evidence.map(describeEvidence),
    draft: result.draft?.answer ?? null,
    draftLanguage,
    citations: result.draft?.citations ?? [],
    citationVerification,
    semanticVerification,
    claimAudits: checks.claimAudit ?? [],
    verifierError: checks.verifierError ?? null,
    finalAction: result.action,
    pipelineCalls,
    validation: {
      classificationPassed,
      requiredSourcesPassed: sourcesPassed,
      generationAndVerificationPassed: generationPassed,
      sourceLanguageDistinctionPassed: englishTafsirLabelPassed,
      passed: classificationPassed && sourcesPassed && generationPassed && englishTafsirLabelPassed,
    },
  };
}

async function run() {
  if (process.env.RUN_LIVE_KNOWLEDGE_E2E !== "1") {
    throw new Error("Set RUN_LIVE_KNOWLEDGE_E2E=1 to run read-only MongoDB and live model validation");
  }

  let db;
  try {
    db = await connectMongo();
    const collection = db.collection("knowledge_chunks");
    const inventory = [];
    for (const { key, sourceId } of SOURCES) {
      const [storedCount, approvedCount, sample] = await Promise.all([
        collection.countDocuments({ sourceId }),
        collection.countDocuments({ sourceId, "metadata.approved": true }),
        collection.findOne({ sourceId }, { projection: { _id: 0, chunkId: 1, metadata: 1 } }),
      ]);
      inventory.push({ key, sourceId, storedCount, approvedCount, sampleChunkId: sample?.chunkId ?? null, sampleMetadata: compactCitation({ sourceId, ...sample?.metadata }) });
    }

    const embeddingProvider = createVoyageEmbeddingProvider();
    const retriever = createRetriever({ db, embeddingProvider, topK: 5 });
    const llmProvider = createConfiguredLLMProvider();
    const draftGenerator = createDraftGenerator({ llmProvider });
    const counts = { retrievalCalls: 0, draftGenerationCalls: 0 };
    const checks = { citation: null, semantic: null, claimAudit: [], verifierError: null };
    const baseEvidenceVerifier = createEvidenceVerifierService(
      createSemanticVerificationProvider({ llmProvider }),
      { onClaimAudit(audit) { checks.claimAudit = audit; } }
    );
    const orchestrator = createAIOrchestrator({
      retriever: {
        async retrieve(...args) {
          counts.retrievalCalls += 1;
          return retriever.retrieve(...args);
        },
      },
      draftGenerator: {
        async generateDraft(...args) {
          counts.draftGenerationCalls += 1;
          return draftGenerator.generateDraft(...args);
        },
      },
      citationVerifier: {
        verifyCitations(draft, evidence) {
          checks.citation = verifyCitations(draft, evidence);
          return checks.citation;
        },
      },
      evidenceVerifier: {
        async verify(input) {
          try {
            checks.semantic = await baseEvidenceVerifier.verify(input);
            return checks.semantic;
          } catch (error) {
            checks.verifierError = error.message;
            throw error;
          }
        },
      },
    });

    const selectedKeys = process.env.KNOWLEDGE_E2E_CASE?.split(",").map((key) => key.trim()).filter(Boolean);
    const casesToRun = selectedKeys ? CASES.filter(({ key }) => selectedKeys.includes(key)) : CASES;
    const unknownKeys = selectedKeys?.filter((key) => !CASES.some((testCase) => testCase.key === key)) || [];
    if (unknownKeys.length) throw new Error(`Unknown KNOWLEDGE_E2E_CASE: ${unknownKeys.join(", ")}`);

    const reports = [];
    for (const testCase of casesToRun) {
      const before = { ...counts };
      checks.citation = null;
      checks.semantic = null;
      checks.claimAudit = [];
      checks.verifierError = null;
      let report;
      try {
        const result = await orchestrator.processQuestion({
          questionId: `language-aware-rag-${testCase.key}`,
          text: testCase.question,
        });
        report = makeCaseReport(testCase, result, checks, {
          retrievalCalls: counts.retrievalCalls - before.retrievalCalls,
          draftGenerationCalls: counts.draftGenerationCalls - before.draftGenerationCalls,
        });
      } catch (error) {
        report = {
          question: testCase.question,
          expectedLanguage: testCase.language,
          crossLingual: testCase.crossLingual ?? false,
          error: error.message,
          validation: { passed: false },
          pipelineCalls: {
            retrievalCalls: counts.retrievalCalls - before.retrievalCalls,
            draftGenerationCalls: counts.draftGenerationCalls - before.draftGenerationCalls,
          },
        };
      }
      reports.push({ key: testCase.key, ...report });
      process.stdout.write(`${JSON.stringify({ key: testCase.key, ...report }, null, 2)}\n`);
    }

    const sourceReport = {
      readOnly: true,
      note: "Only count/findOne reads and vector retrieval were performed; no MongoDB writes, ingestion, corpus embedding, or vector-index changes.",
      sources: inventory,
      tafsirSourceUrl: TAFSIR_SOURCE_URL,
    };
    const summary = {
      llmProvider: process.env.LLM_PROVIDER || "openai",
      model: llmProvider.getUsage ? "gpt-5.4-mini" : "Gemini model configured by provider",
      usage: llmProvider.getUsage ? llmProvider.getUsage() : null,
      estimatedCostUsd: llmProvider.getUsage
        ? Number(((llmProvider.getUsage().inputTokens * 0.75 + llmProvider.getUsage().outputTokens * 4.5) / 1_000_000).toFixed(6))
        : null,
      languageValidation: {
        arabicClassification: reports.filter((r) => r.expectedLanguage === "ar").every((r) => r.detectedLanguage === "ar"),
        englishClassification: reports.filter((r) => r.expectedLanguage === "en").every((r) => r.detectedLanguage === "en"),
        arabicGeneration: reports.filter((r) => r.expectedLanguage === "ar" && r.draft !== null).every((r) => r.draftLanguage === "ar"),
        englishGeneration: reports.filter((r) => r.expectedLanguage === "en" && r.draft !== null).every((r) => r.draftLanguage === "en"),
      },
      sourceValidation: inventory.map(({ key, sourceId, storedCount, approvedCount }) => ({
        key, sourceId, storedCount, approvedCount, allApproved: storedCount > 0 && storedCount === approvedCount,
      })),
      routingValidation: reports.map(({ key, category, requiredSourceTypes, missingRequiredSourceTypes, finalAction, validation }) => ({
        key, category, requiredSourceTypes, missingRequiredSourceTypes, finalAction, passed: validation.passed,
      })),
      casesPassed: reports.filter((r) => r.validation.passed).length,
      casesTotal: reports.length,
      errors: reports.filter((r) => r.error).map(({ key, error }) => ({ key, error })),
    };

    process.stdout.write(`\nSOURCE_INVENTORY\n${JSON.stringify(sourceReport, null, 2)}\n`);
    process.stdout.write(`\nVALIDATION_SUMMARY\n${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    if (db) await closeMongo();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
