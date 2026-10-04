const assert = require("node:assert/strict");
const test = require("node:test");

const { createOpenAILLMProvider, DEFAULT_MODEL } = require("./openaiLLMProvider");
const { createConfiguredLLMProvider } = require("./llmProviderFactory");
const { createDraftGenerator } = require("../generator/draftGenerator");
const { createSemanticVerificationProvider } = require("../verifier/semanticVerificationProvider");
const { createEvidenceVerifierService } = require("../verifier/evidenceVerifierService");

function withApiKey(value, callback) {
  const previous = process.env.OPENAI_API_KEY;
  if (value === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = value;
  try {
    return callback();
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
}

function mockClient(responseOrError) {
  const requests = [];
  return {
    requests,
    client: {
      responses: {
        async create(request) {
          requests.push(request);
          if (responseOrError instanceof Error) throw responseOrError;
          return typeof responseOrError === "function" ? responseOrError(request) : responseOrError;
        },
      },
    },
  };
}

const evidence = [{
  sourceId: "quranpedia-quran-hafs",
  chunkId: "quran-hafs-112-1",
  text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
  citation: { sourceType: "quran", language: "ar", reference: "Quran 112:1", surahName: "سورة الإخلاص", surahNumber: 112, ayahNumber: 1 },
}];

test("OpenAI provider uses OPENAI_API_KEY and fails clearly when it is missing", () => {
  withApiKey(undefined, () => {
    assert.throws(() => createOpenAILLMProvider({ client: { responses: { create() {} } } }), /OPENAI_API_KEY is required/);
  });

  let configuration;
  class FakeOpenAI {
    constructor(options) {
      configuration = options;
      this.responses = { create: async () => ({ output_text: "ok" }) };
    }
  }
  withApiKey("test-only-key", () => {
    createOpenAILLMProvider({ OpenAIClient: FakeOpenAI });
  });
  assert.equal(configuration.apiKey, "test-only-key");
  assert.equal(configuration.maxRetries, 0);
  assert.equal(configuration.timeout, 30_000);
});

test("draft generation sends the expected prompt and preserves the existing draft contract", async () => {
  const fake = mockClient({ output_text: "Tawhid is affirming Allah's oneness.", usage: { input_tokens: 41, output_tokens: 12 } });
  const provider = withApiKey("test-only-key", () => createOpenAILLMProvider({ client: fake.client }));
  const draft = await createDraftGenerator({ llmProvider: provider }).generateDraft({
    question: "What does Tawhid mean?",
    language: "en",
    evidence,
  });

  assert.equal(fake.requests[0].model, "gpt-5.4-mini");
  assert.equal(fake.requests[0].reasoning.effort, "none");
  assert.equal(fake.requests[0].max_output_tokens, 1200);
  assert.match(fake.requests[0].input, /What does Tawhid mean\?/);
  assert.match(fake.requests[0].input, /قُلْ هُوَ اللَّهُ أَحَدٌ/);
  assert.equal(draft.answer, "Tawhid is affirming Allah's oneness. (Al-Ikhlas 112:1)");
  assert.equal(draft.language, "en");
  assert.equal(draft.citations[0].chunkId, "quran-hafs-112-1");
  assert.deepEqual(provider.getUsage().byTask.draft_generation, {
    calls: 1, inputTokens: 41, outputTokens: 12, reasoningTokens: 0, incompleteResponses: 0, outputCeilingReached: 0,
  });
});

test("semantic verification uses structured output and returns the existing verification structure", async () => {
  const structured = JSON.stringify({
    claims: [{
      draftSpan: 1,
      factual: true,
      supportingEvidence: [1],
      supported: true,
      reason: "",
    }],
    warnings: [],
    riskFlags: [],
  });
  const fake = mockClient({ output_text: structured, usage: { input_tokens: 50, output_tokens: 14, output_tokens_details: { reasoning_tokens: 2 } } });
  const provider = withApiKey("test-only-key", () => createOpenAILLMProvider({ client: fake.client }));
  const semanticProvider = createSemanticVerificationProvider({ llmProvider: provider });
  const service = createEvidenceVerifierService(semanticProvider);
  const verification = await service.verify({
    question: "What does Tawhid mean?",
    draft: { answer: "Tawhid is affirming Allah's oneness." },
    evidence,
  });

  assert.equal(fake.requests[0].model, DEFAULT_MODEL);
  assert.equal(fake.requests[0].reasoning.effort, "none");
  assert.equal(fake.requests[0].max_output_tokens, 700);
  assert.equal(fake.requests[0].text.format.type, "json_schema");
  assert.equal(fake.requests[0].text.format.strict, true);
  assert.ok(fake.requests[0].text.format.schema.properties.claims);
  assert.ok(!fake.requests[0].text.format.schema.properties.evidenceSupported);
  assert.match(fake.requests[0].input, /What does Tawhid mean\?/);
  assert.match(fake.requests[0].input, /Tawhid is affirming Allah's oneness\./);
  assert.match(fake.requests[0].input, /قُلْ هُوَ اللَّهُ أَحَدٌ/);
  assert.equal(verification.evidenceSupported, true);
  assert.deepEqual(verification.unsupportedClaims, []);
  assert.deepEqual(verification.warnings, []);
  assert.deepEqual(verification.riskFlags, []);
  assert.equal(verification.status, "PASS");
  assert.equal(provider.getUsage().reasoningTokens, 2);
});

test("provider selection supports OpenAI by default and Gemini rollback", () => {
  withApiKey("test-only-key", () => {
    const previousProvider = process.env.LLM_PROVIDER;
    delete process.env.LLM_PROVIDER;
    const openai = createConfiguredLLMProvider({ client: { responses: { create: async () => ({ output_text: "ok" }) } } });
    if (previousProvider !== undefined) process.env.LLM_PROVIDER = previousProvider;
    assert.equal(typeof openai.generate, "function");
    const gemini = createConfiguredLLMProvider({ provider: "gemini", apiKey: "test-only-gemini-key" });
    assert.equal(typeof gemini.generate, "function");
  });
  assert.throws(() => createConfiguredLLMProvider({ provider: "unknown" }), /Choose "openai" or "gemini"/);
});

test("provider errors are sanitized and failures never return a draft", async (t) => {
  const errors = [
    Object.assign(new Error("secret should not escape"), { status: 429 }),
    Object.assign(new Error("secret should not escape"), { status: 401 }),
    Object.assign(new Error("secret should not escape"), { name: "APIConnectionTimeoutError" }),
    Object.assign(new Error("secret should not escape"), { name: "APIConnectionError", cause: { code: "ECONNRESET" } }),
  ];
  const expected = [/rate limit/i, /authentication failed/i, /timed out/i, /connect to OpenAI/i];

  for (const [index, original] of errors.entries()) {
    await t.test(expected[index].source, async () => {
      const fake = mockClient(original);
      const provider = withApiKey("test-only-key", () => createOpenAILLMProvider({ client: fake.client }));
      await assert.rejects(provider.generate("short prompt", { taskType: "draft_generation" }), (error) => {
        assert.match(error.message, expected[index]);
        assert.doesNotMatch(error.message, /secret should not escape|test-only-key/);
        return true;
      });
      assert.equal(fake.requests.length, 1, "failed calls are not retried implicitly");
    });
  }
});

test("malformed structured response and output truncation fail instead of being accepted", async () => {
  const malformed = mockClient({ output_text: "not JSON" });
  const malformedProvider = withApiKey("test-only-key", () => createOpenAILLMProvider({ client: malformed.client }));
  const verifier = createEvidenceVerifierService(createSemanticVerificationProvider({ llmProvider: malformedProvider }));
  await assert.rejects(verifier.verify({ question: "Question?", draft: { answer: "Draft." }, evidence }), /valid JSON/);

  const incomplete = mockClient({ status: "incomplete", output_text: "partial" });
  const incompleteProvider = withApiKey("test-only-key", () => createOpenAILLMProvider({ client: incomplete.client }));
  await assert.rejects(incompleteProvider.generate("prompt", { maxOutputTokens: 700 }), /response was incomplete/);
});
