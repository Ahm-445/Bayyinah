const env = require("../config/env");
const { normalizeEvidence } = require("./citations");

const AI_ACTIONS = ["ANSWER", "CLARIFY", "ABSTAIN", "REFER"];

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`AI pipeline timed out after ${ms} ms`)),
      ms
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Which pipeline stages ran, derived from the result itself. */
function buildPipeline({ safety, evidence, draft, verification }) {
  const safetyStatus =
    safety?.decision === "BLOCK"
      ? "failed"
      : safety?.decision === "REVIEW"
        ? "warning"
        : "done";

  const verificationStatus = !verification
    ? "skipped"
    : verification.status === "PASS"
      ? "done"
      : verification.status === "NEEDS_REVIEW"
        ? "warning"
        : "failed";

  return [
    { stage: "classification", status: "done" },
    { stage: "safety", status: safetyStatus },
    {
      stage: "retrieval",
      status: evidence.length
        ? "done"
        : safety?.decision === "BLOCK"
          ? "skipped"
          : "warning",
    },
    { stage: "generation", status: draft ? "done" : "skipped" },
    { stage: "verification", status: verificationStatus },
  ];
}

/**
 * Turns the AI module's AIResult into what the Backend stores.
 * Throws if the result does not follow the contract (docs/api.md, part 1).
 */
function normalizeAIResult(raw) {
  const aiAction = raw?.aiAction ?? raw?.action;

  if (!AI_ACTIONS.includes(aiAction)) {
    throw new Error(`AI returned an invalid action: ${aiAction}`);
  }

  if (!raw.classification || !raw.safety) {
    throw new Error("AI result is missing classification or safety");
  }

  const evidence = (Array.isArray(raw.evidence) ? raw.evidence : []).map(
    normalizeEvidence
  );
  const draft = raw.draft && typeof raw.draft.answer === "string"
    ? raw.draft
    : null;
  const verification = raw.verification ?? null;

  return {
    action: raw.action ?? aiAction,
    aiAction,
    classification: { ...raw.classification },
    safety: raw.safety,
    evidence,
    draft,
    clarificationQuestion: raw.clarificationQuestion ?? null,
    verification,
    pipeline: buildPipeline({
      safety: raw.safety,
      evidence,
      draft,
      verification,
    }),
  };
}

/**
 * @param {Object} [options]
 * @param {"real"|"mock"} [options.mode]
 * @param {Function} [options.processQuestion] injected implementation (tests)
 */
function createAIService({
  mode = env.aiMode,
  processQuestion,
  timeoutMs = env.aiTimeoutMs,
} = {}) {
  let moduleRef;

  function implementation() {
    if (processQuestion) return processQuestion;

    // Loaded lazily so mock mode never pulls in the provider SDKs.
    moduleRef =
      moduleRef ||
      (mode === "mock"
        ? require("./mockAI")
        : require("../modules/ai"));

    return moduleRef.processQuestion;
  }

  return {
    mode: processQuestion ? "custom" : mode,

    async process(input) {
      const raw = await withTimeout(
        Promise.resolve(implementation()(input)),
        timeoutMs
      );

      return normalizeAIResult(raw);
    },

    async close() {
      if (mode === "real" && moduleRef?.closeAI) await moduleRef.closeAI();
    },
  };
}

module.exports = { createAIService, normalizeAIResult, buildPipeline };
