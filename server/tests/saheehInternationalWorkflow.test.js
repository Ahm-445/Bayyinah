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

const LIVE_RUN_ENABLED = process.env.RUN_LIVE_AI_TESTS === "1";

test("Saheeh International translation completes the Tawhid answer workflow", {
  skip: !LIVE_RUN_ENABLED && "Set RUN_LIVE_AI_TESTS=1 to call MongoDB and live model APIs",
  timeout: 180_000,
}, async () => {
  const expectedSourceUrl = process.env.SAHEEH_TRANSLATION_SOURCE_URL;
  const expectedSourceVersion = process.env.SAHEEH_TRANSLATION_SOURCE_VERSION;
  assert.ok(expectedSourceUrl, "Set SAHEEH_TRANSLATION_SOURCE_URL to the verified source page URL");
  assert.ok(expectedSourceVersion, "Set SAHEEH_TRANSLATION_SOURCE_VERSION to the verified edition/version");

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

    const question = "What does Tawhid mean in Islam?";
    const result = await orchestrator.processQuestion({
      questionId: "saheeh-translation-workflow-test",
      text: question,
      language: "en",
      retrievalLanguages: ["en"],
    });

    const translationEvidence = result.evidence.filter(
      (item) => item.sourceId === "quran-translation-1947"
    );
    assert.ok(translationEvidence.length > 0, "Expected English translation evidence for the Tawhid question");
    assert.equal(result.classification.category, "aqeedah");
    assert.equal(result.safety.decision, "ALLOW");
    assert.ok(result.draft?.answer, "Expected a generated answer");
    assert.match(result.draft.answer.toLowerCase(), /tawhid|oneness|one god/);
    assert.ok(
      translationEvidence.some((item) => result.draft.citations.some((citation) =>
        citation.sourceId === item.sourceId &&
        citation.chunkId === item.chunkId &&
        citation.reference === item.citation.reference
      )),
      "Expected a citation to retrieved translation evidence"
    );

    const translationCitations = result.draft.citations.filter(
      (citation) => citation.sourceId === "quran-translation-1947"
    );
    assert.ok(translationCitations.length > 0, "Expected translation citations");
    for (const citation of translationCitations) {
      assert.equal(citation.sourceUrl, expectedSourceUrl, "Citation URL must match the verified translation source");
      assert.equal(citation.version, expectedSourceVersion, "Citation version must match the verified translation edition");
    }

    assert.equal(result.verification?.status, "PASS");
    assert.equal(result.verification.citationValid, true);
    assert.equal(result.verification.evidenceSupported, true);
    assert.deepEqual(result.verification.unsupportedClaims, []);
    assert.equal(result.action, "ANSWER");

    console.log(JSON.stringify({
      question,
      action: result.action,
      answer: result.draft.answer,
      retrieved: result.evidence.map((item) => ({
        chunkId: item.chunkId,
        reference: item.citation.reference,
        score: item.score,
      })),
      citations: translationCitations,
      verification: result.verification,
    }, null, 2));
  } finally {
    if (db) await closeMongo();
  }
});
