const { connectMongo, closeMongo } = require("./rag/storage/mongoClient");
const { createConfiguredLLMProvider } = require("./providers/llmProviderFactory");
const { createVoyageEmbeddingProvider } = require("./providers/voyageEmbeddingProvider");
const { createRetriever } = require("./rag/retrieval/retriever");
const { createDraftGenerator } = require("./generator/draftGenerator");
const { verifyCitations } = require("./verifier/citationVerifier");
const { createSemanticVerificationProvider } = require("./verifier/semanticVerificationProvider");
const { createEvidenceVerifierService } = require("./verifier/evidenceVerifierService");
const { createAIOrchestrator } = require("./orchestrator/aiOrchestrator");

let orchestratorPromise;

async function getOrchestrator() {
  if (!orchestratorPromise) {
    orchestratorPromise = (async () => {
      const db = await connectMongo();
      const llmProvider = createConfiguredLLMProvider();
      const retriever = createRetriever({
        db,
        embeddingProvider: createVoyageEmbeddingProvider(),
        topK: 3,
      });
      const evidenceVerifier = createEvidenceVerifierService(
        createSemanticVerificationProvider({ llmProvider })
      );
      return createAIOrchestrator({
        retriever,
        draftGenerator: createDraftGenerator({ llmProvider }),
        citationVerifier: { verifyCitations },
        evidenceVerifier,
      });
    })().catch((error) => {
      orchestratorPromise = undefined;
      throw error;
    });
  }
  return orchestratorPromise;
}

async function processQuestion(input) {
  const orchestrator = await getOrchestrator();
  return orchestrator.processQuestion(input);
}

async function closeAI() {
  orchestratorPromise = undefined;
  await closeMongo();
}

module.exports = { processQuestion, closeAI };
