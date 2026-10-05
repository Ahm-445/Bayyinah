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

const LIVE_RUN_ENABLED = process.env.RUN_LIVE_HADITH_TESTS === "1";

test("Bukhari hadith completes the retrieval-to-verified-answer workflow", {
  skip: !LIVE_RUN_ENABLED && "Set RUN_LIVE_HADITH_TESTS=1 to call MongoDB and live model APIs",
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

    const question = "What does Sahih al-Bukhari hadith 1 teach about intentions?";
    const result = await orchestrator.processQuestion({
      questionId: "bukhari-intentions-workflow-test",
      text: question,
      language: "en",
      retrievalLanguages: ["en", "ar"],
    });

    const bukhariEvidence = result.evidence.filter(
      (item) => item.sourceId === "ahmedbaset-hadith-bukhari"
    );
    assert.equal(result.classification.category, "hadith");
    assert.equal(result.safety.decision, "ALLOW");
    assert.ok(bukhariEvidence.length > 0, "Expected retrieved evidence from the uploaded Bukhari chunks");
    assert.ok(result.draft?.answer, "Expected a generated answer");
    assert.match(result.draft.answer.toLowerCase(), /intention|intentions/);
    assert.equal(result.action, "ANSWER");
    assert.equal(result.verification?.status, "PASS");
    assert.equal(result.verification.citationValid, true);
    assert.equal(result.verification.evidenceSupported, true);
    assert.deepEqual(result.verification.unsupportedClaims, []);

    const bukhariCitations = result.draft.citations.filter(
      (citation) => citation.sourceId === "ahmedbaset-hadith-bukhari"
    );
    assert.ok(bukhariCitations.length > 0, "Expected the answer to cite Bukhari evidence");
    assert.ok(bukhariCitations.some((citation) =>
      citation.hadithCollection === "Sahih al-Bukhari" &&
      Number(citation.hadithNumber) === 1 &&
      citation.reference === "Sahih al-Bukhari 1"
    ), "Expected a citation to Sahih al-Bukhari 1");
    assert.ok(bukhariCitations.every((citation) =>
      citation.sourceUrl === `https://sunnah.com/bukhari:${citation.hadithNumber}`
    ));

    console.log(JSON.stringify({
      question,
      action: result.action,
      category: result.classification.category,
      answer: result.draft.answer,
      retrievedBukhari: bukhariEvidence.map((item) => ({
        reference: item.citation.reference,
        hadithNumber: item.citation.hadithNumber,
        score: item.score,
      })),
      bukhariCitations,
      verification: result.verification,
    }, null, 2));
  } finally {
    if (db) await closeMongo();
  }
});
