require("dotenv").config();

const assert = require("node:assert/strict");
const test = require("node:test");

const { connectMongo, closeMongo } = require("../src/modules/ai/rag/storage/mongoClient");
const { createVoyageEmbeddingProvider } = require("../src/modules/ai/providers/voyageEmbeddingProvider");
const { createRetriever } = require("../src/modules/ai/rag/retrieval/retriever");
const { createConfiguredLLMProvider } = require("../src/modules/ai/providers/llmProviderFactory");
const { createDraftGenerator } = require("../src/modules/ai/generator/draftGenerator");
const { verifyCitations } = require("../src/modules/ai/verifier/citationVerifier");
const { createSemanticVerificationProvider } = require("../src/modules/ai/verifier/semanticVerificationProvider");
const { createEvidenceVerifierService } = require("../src/modules/ai/verifier/evidenceVerifierService");
const { createAIOrchestrator } = require("../src/modules/ai/orchestrator/aiOrchestrator");
const { SOURCE_ID, SOURCE_URL } = require("../src/modules/ai/rag/ingestion/tafsir/tafsirChunkBuilder");

const LIVE_RUN_ENABLED = process.env.RUN_LIVE_TAFSIR_TESTS === "1";

test("Quranpedia tafsir completes the Tawhid answer workflow", {
  skip: !LIVE_RUN_ENABLED && "Set RUN_LIVE_TAFSIR_TESTS=1 to call MongoDB and live model APIs",
  timeout: 180_000,
}, async () => {
  let db;
  try {
    db = await connectMongo();
    const embeddingProvider = createVoyageEmbeddingProvider();
    const retriever = createRetriever({ db, embeddingProvider, topK: 5 });
    const llmProvider = createConfiguredLLMProvider();
    const orchestrator = createAIOrchestrator({
      retriever,
      draftGenerator: createDraftGenerator({ llmProvider }),
      citationVerifier: { verifyCitations },
      evidenceVerifier: createEvidenceVerifierService(
        createSemanticVerificationProvider({ llmProvider })
      ),
    });

    const question = "What does the tafsir say about Tawhid and shirk?";
    const result = await orchestrator.processQuestion({
      questionId: "quranpedia-tafsir-tawhid-workflow-test",
      text: question,
      language: "en",
      retrievalLanguages: ["ar"],
    });

    const tafsirEvidence = result.evidence.filter((item) => item.sourceId === SOURCE_ID);
    assert.equal(result.classification.category, "tafsir");
    assert.equal(result.safety.decision, "ALLOW");
    assert.ok(tafsirEvidence.length > 0, "Expected retrieved evidence from the uploaded tafsir chunks");
    assert.ok(result.draft?.answer, "Expected a generated answer");
    assert.equal(result.action, "ANSWER");
    assert.equal(result.verification?.status, "PASS");
    assert.equal(result.verification.citationValid, true);
    assert.equal(result.verification.evidenceSupported, true);
    assert.deepEqual(result.verification.unsupportedClaims, []);

    const tafsirCitations = result.draft.citations.filter((citation) => citation.sourceId === SOURCE_ID);
    assert.ok(tafsirCitations.length > 0, "Expected the answer to cite tafsir evidence");
    for (const citation of tafsirCitations) {
      assert.equal(citation.sourceUrl, SOURCE_URL);
      assert.equal(citation.version, "2026-08-10");
      assert.equal(citation.category, "tafsir");
      assert.ok(citation.reference?.startsWith("Quran "), "Citation should identify Quran ayahs");
      assert.ok(Number.isInteger(citation.pageNumber), "Citation should include the tafsir page");
    }

    console.log(JSON.stringify({
      question,
      action: result.action,
      category: result.classification.category,
      answer: result.draft.answer,
      retrievedTafsir: tafsirEvidence.map((item) => ({
        reference: item.citation.reference,
        pageNumber: item.citation.pageNumber,
        score: item.score,
      })),
      tafsirCitations,
      verification: result.verification,
    }, null, 2));
  } finally {
    if (db) await closeMongo();
  }
});
