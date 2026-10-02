const {
  connectMongo,
  closeMongo,
} = require("./rag/storage/mongoClient");

const {
  createVoyageEmbeddingProvider,
} = require("./providers/voyageEmbeddingProvider");

const {
  createGeminiLLMProvider,
  DEFAULT_MODEL,
} = require("./providers/geminiLLMProvider");

const {
  createRetriever,
} = require("./rag/retrieval/retriever");

const {
  createDraftGenerator,
} = require("./generator/draftGenerator");

const {
  verifyCitations,
} = require("./verifier/citationVerifier");

const {
  createSemanticVerificationProvider,
} = require("./verifier/semanticVerificationProvider");

const {
  createEvidenceVerifierService,
} = require("./verifier/evidenceVerifierService");

const {
  createAIOrchestrator,
} = require("./orchestrator/aiOrchestrator");

const RETRIEVAL_TOP_K = 3;

let orchestratorPromise = null;

/**
 * Builds the production AI orchestrator.
 *
 * This is the only wiring the Backend needs. It mirrors the
 * composition used in orchestrator/realOrchestrator.test.js.
 *
 * Environment variables are read from process.env, so the caller
 * (the Backend config) must load server/.env first:
 * MONGODB_URI, MONGODB_DB_NAME, GEMINI_API_KEY, VOYAGE_API_KEY,
 * and optionally GEMINI_MODEL.
 *
 * @returns {Promise<Object>}
 */
async function buildOrchestrator() {
  const db = await connectMongo();

  const model =
    process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const embeddingProvider =
    createVoyageEmbeddingProvider();

  const retriever = createRetriever({
    db,
    embeddingProvider,
    topK: RETRIEVAL_TOP_K,
  });

  const geminiProvider =
    createGeminiLLMProvider({ model });

  const draftGenerator = createDraftGenerator({
    llmProvider: geminiProvider,
    model,
  });

  const evidenceVerifier =
    createEvidenceVerifierService(
      createSemanticVerificationProvider({
        llmProvider: geminiProvider,
        model,
      })
    );

  return createAIOrchestrator({
    retriever,
    draftGenerator,
    citationVerifier: { verifyCitations },
    evidenceVerifier,
  });
}

/**
 * Returns the shared AI orchestrator, creating it on first use.
 *
 * Throws if configuration is missing or MongoDB is unreachable.
 * A failed attempt is not cached, so the next call retries.
 *
 * @returns {Promise<{processQuestion: Function}>}
 */
function getOrchestrator() {
  if (!orchestratorPromise) {
    orchestratorPromise = buildOrchestrator().catch(
      (error) => {
        orchestratorPromise = null;
        throw error;
      }
    );
  }

  return orchestratorPromise;
}

/**
 * Closes the AI module's MongoDB connection (for shutdown and scripts).
 */
async function closeAI() {
  orchestratorPromise = null;
  await closeMongo();
}

module.exports = {
  getOrchestrator,
  closeAI,
};
