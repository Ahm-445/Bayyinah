const OpenAI = require("openai");

const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_TIMEOUT_MS = 30_000;

const VERIFICATION_RESPONSE_FORMAT = Object.freeze({
  type: "json_schema",
  name: "bayyinah_evidence_verification",
  strict: true,
  schema: {
    type: "object",
    properties: {
      claims: {
        type: "array",
        items: {
          type: "object",
          properties: {
            draftSpan: { type: "integer", minimum: 1 },
            factual: { type: "boolean" },
            supportingEvidence: { type: "array", items: { type: "integer", minimum: 1 } },
            supported: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["draftSpan", "factual", "supportingEvidence", "supported", "reason"],
          additionalProperties: false,
        },
      },
      warnings: { type: "array", items: { type: "string" } },
      riskFlags: { type: "array", items: { type: "string" } },
    },
    required: ["claims", "warnings", "riskFlags"],
    additionalProperties: false,
  },
});

function safeOpenAIError(error) {
  const status = error?.status;
  const code = error?.code || error?.cause?.code;

  if (status === 401 || status === 403) {
    return new Error("OpenAI authentication failed. Check OPENAI_API_KEY and API project access.");
  }
  if (status === 429) {
    return new Error("OpenAI rate limit reached (HTTP 429). Retry after the account limit resets.");
  }
  if (typeof status === "number" && status >= 500) {
    return new Error(`OpenAI service error (HTTP ${status}). Retry later.`);
  }
  if (error?.name === "APIConnectionTimeoutError" || error?.name === "AbortError" || code === "ETIMEDOUT") {
    return new Error("OpenAI request timed out.");
  }
  if (error?.name === "APIConnectionError" || ["ECONNRESET", "ECONNREFUSED", "EAI_AGAIN"].includes(code)) {
    return new Error("Could not connect to OpenAI. Check network connectivity and retry.");
  }
  if (typeof status === "number") {
    return new Error(`OpenAI rejected the request (HTTP ${status}). Check the request configuration.`);
  }
  return new Error("OpenAI request failed. Check provider configuration and retry.");
}

function createOpenAILLMProvider({
  client,
  OpenAIClient = OpenAI,
  timeout = DEFAULT_TIMEOUT_MS,
} = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to use the OpenAI LLM provider.");
  }

  const openai = client || new OpenAIClient({
    apiKey,
    timeout,
    // Keep request/cost accounting predictable and avoid implicit duplicate calls.
    maxRetries: 0,
  });

  if (!openai?.responses || typeof openai.responses.create !== "function") {
    throw new Error("OpenAI client must implement responses.create().");
  }

  const usage = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    incompleteResponses: 0,
    outputCeilingReached: 0,
    byTask: {},
  };

  return {
    async generate(prompt, options = {}) {
      if (!prompt || typeof prompt !== "string") {
        throw new Error("Prompt is required");
      }

      const taskType = options.taskType || "unspecified";
      const request = {
        model: DEFAULT_MODEL,
        input: prompt,
        reasoning: { effort: "none" },
        max_output_tokens: options.maxOutputTokens || 1200,
        ...(options.responseFormat ? { text: { format: options.responseFormat } } : {}),
      };

      usage.calls += 1;
      usage.byTask[taskType] ||= { calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, incompleteResponses: 0, outputCeilingReached: 0 };
      usage.byTask[taskType].calls += 1;

      let response;
      try {
        response = await openai.responses.create(request);
      } catch (error) {
        throw safeOpenAIError(error);
      }

      if (response?.status === "incomplete") {
        usage.incompleteResponses += 1;
        usage.byTask[taskType].incompleteResponses += 1;
        throw new Error("OpenAI response was incomplete, possibly because max_output_tokens was reached.");
      }

      const text = response?.output_text;
      if (typeof text !== "string" || !text.trim()) {
        throw new Error("OpenAI returned an empty or malformed response.");
      }

      const callUsage = response.usage || {};
      const outputTokens = callUsage.output_tokens || 0;
      const reasoningTokens = callUsage.output_tokens_details?.reasoning_tokens || 0;
      usage.inputTokens += callUsage.input_tokens || 0;
      usage.outputTokens += outputTokens;
      usage.reasoningTokens += reasoningTokens;
      usage.byTask[taskType].inputTokens += callUsage.input_tokens || 0;
      usage.byTask[taskType].outputTokens += outputTokens;
      usage.byTask[taskType].reasoningTokens += reasoningTokens;
      if (outputTokens >= request.max_output_tokens) {
        usage.outputCeilingReached += 1;
        usage.byTask[taskType].outputCeilingReached += 1;
      }

      return text.trim();
    },
    getUsage() {
      return JSON.parse(JSON.stringify(usage));
    },
  };
}

module.exports = {
  createOpenAILLMProvider,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  VERIFICATION_RESPONSE_FORMAT,
  safeOpenAIError,
};
