const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ingestHadith, embedBatchWithRetry, isTransientEmbeddingError } = require("./hadithIngestion");

function createHarness({ bukhariCount = 1, muslimCount = 1, existing = [] } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hadith-resume-test-"));
  const bukhariFile = path.join(directory, "bukhari.json");
  const muslimFile = path.join(directory, "muslim.json");
  const makeData = (bookId, count) => ({
    id: bookId,
    metadata: { id: bookId },
    chapters: [{ id: 0, bookId, arabic: "المقدمة", english: "Introduction" }],
    hadiths: Array.from({ length: count }, (_, index) => ({
      id: bookId * 1000 + index + 1,
      idInBook: index + 1,
      chapterId: 0,
      bookId,
      arabic: `حديث عربي ${bookId}-${index + 1}`,
      english: { narrator: `Narrator ${index + 1}`, text: `English hadith ${bookId}-${index + 1}` },
    })),
  });
  fs.writeFileSync(bukhariFile, JSON.stringify(makeData(1, bukhariCount)));
  fs.writeFileSync(muslimFile, JSON.stringify(makeData(2, muslimCount)));

  const stored = new Map(existing.map((document) => [document.chunkId, structuredClone(document)]));
  const bulkWrites = [];
  const collection = {
    find(filter) {
      let documents = [...stored.values()].filter((document) => document.sourceId === filter.sourceId);
      if (filter.chunkId?.$in) documents = documents.filter((document) => filter.chunkId.$in.includes(document.chunkId));
      return { async toArray() { return documents.map(({ chunkId }) => ({ chunkId })); } };
    },
    async bulkWrite(operations, options) {
      bulkWrites.push({ operations, options });
      for (const operation of operations) {
        const document = operation.updateOne.update.$set;
        stored.set(document.chunkId, document);
      }
    },
    async countDocuments(filter) {
      const documents = [...stored.values()].filter((document) => document.sourceId === filter.sourceId);
      return filter.dimensions ? documents.filter((document) => document.dimensions !== filter.dimensions.$ne).length : documents.length;
    },
  };
  const approvedSource = { version: "v-test", usageBasis: "Authorized test fixture", approved: true };
  const ingest = (options = {}) => ingestHadith({
    bukhariFile,
    muslimFile,
    expectedHadithCounts: { bukhari: bukhariCount, muslim: muslimCount },
    sourceMetadata: approvedSource,
    db: { collection: () => collection },
    batchSize: 8,
    ...options,
  });
  return { directory, stored, bulkWrites, ingest };
}

function existingHadithChunk(book, hadithNumber, extra = {}) {
  const sourceId = `ahmedbaset-hadith-${book}`;
  return {
    chunkId: `${sourceId}-${hadithNumber}`,
    sourceId,
    text: "Existing document must remain unchanged",
    metadata: { hadithNumber },
    embedding: Array(1024).fill(0.7),
    dimensions: 1024,
    model: "existing-model",
    ...extra,
  };
}

function embeddingProviderFor({ failThen, alwaysFail } = {}) {
  let calls = 0;
  const requests = [];
  return {
    requests,
    get calls() { return calls; },
    async embedBatch(texts, options) {
      calls++;
      requests.push({ texts, options });
      if (alwaysFail) throw alwaysFail;
      if (failThen && calls <= failThen.length && failThen[calls - 1]) throw failThen[calls - 1];
      return texts.map(() => Array(1024).fill(0.25));
    },
  };
}

test("existing chunks are skipped and only missing chunks are embedded", async () => {
  const oldBukhari = existingHadithChunk("bukhari", 1);
  const oldMuslim = existingHadithChunk("muslim", 1);
  const harness = createHarness({ bukhariCount: 2, muslimCount: 2, existing: [oldBukhari, oldMuslim] });
  try {
    const provider = embeddingProviderFor();
    const result = await harness.ingest({ embeddingProvider: provider });
    assert.equal(provider.calls, 2);
    assert.ok(provider.requests.every((request) => request.texts.length === 1));
    assert.equal(result.written, 2);
    assert.equal(result.books[0].skippedThisRun, 1);
    assert.equal(result.books[1].skippedThisRun, 1);
    assert.equal(harness.stored.get(oldBukhari.chunkId).text, oldBukhari.text);
    assert.equal(harness.stored.get(oldBukhari.chunkId).embedding[0], 0.7);
    assert.equal(harness.stored.get(oldMuslim.chunkId).text, oldMuslim.text);
    assert.equal(harness.stored.size, 4);
  } finally {
    fs.rmSync(harness.directory, { recursive: true, force: true });
  }
});

test("dry run checks existing IDs without embedding or writing", async () => {
  const oldMuslim = existingHadithChunk("muslim", 1);
  const harness = createHarness({ bukhariCount: 2, muslimCount: 3, existing: [oldMuslim] });
  const provider = embeddingProviderFor();
  try {
    const result = await harness.ingest({ dryRun: true, embeddingProvider: provider });
    assert.equal(result.mongoChecked, true);
    assert.equal(result.books[0].wouldEmbed, 2);
    assert.equal(result.books[1].alreadyStored, 1);
    assert.equal(result.books[1].wouldEmbed, 2);
    assert.equal(result.wouldEmbed, 4);
    assert.equal(provider.calls, 0);
    assert.equal(harness.bulkWrites.length, 0);
  } finally {
    fs.rmSync(harness.directory, { recursive: true, force: true });
  }
});

test("ECONNRESET is retried with exponential backoff and successful retry writes", async () => {
  const harness = createHarness();
  const provider = embeddingProviderFor({ failThen: [Object.assign(new Error("socket reset"), { code: "ECONNRESET" })] });
  const delays = [];
  try {
    const result = await harness.ingest({ embeddingProvider: provider, sleep: async (delay) => delays.push(delay) });
    assert.equal(provider.calls, 3);
    assert.deepEqual(delays, [1000]);
    assert.equal(result.written, 2);
    assert.equal(harness.stored.size, 2);
  } finally {
    fs.rmSync(harness.directory, { recursive: true, force: true });
  }
});

test("retry delay schedule is exponential and capped at the configured retry count", async () => {
  const delays = [];
  let calls = 0;
  const failFiveTimes = Object.assign(new Error("temporary reset"), { code: "ECONNRESET" });
  const result = await embedBatchWithRetry({
    async embedBatch() {
      calls++;
      if (calls <= 5) throw failFiveTimes;
      return [[1]];
    },
  }, ["input"], { sleep: async (delay) => delays.push(delay) });
  assert.equal(calls, 6);
  assert.deepEqual(delays, [1000, 2000, 4000, 8000, 16000]);
  assert.deepEqual(result, [[1]]);
});

for (const [name, error] of [
  ["HTTP 429", Object.assign(new Error("Voyage API error (429): rate limited"), { status: 429 })],
  ["HTTP 500", Object.assign(new Error("Voyage API error (500): internal server error"), { status: 500 })],
  ["HTTP 503", Object.assign(new Error("Voyage API error (503): service unavailable"), { status: 503 })],
  ["ETIMEDOUT", Object.assign(new Error("socket timed out"), { code: "ETIMEDOUT" })],
  ["fetch failed", Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("connection reset"), { code: "ECONNRESET" }) })],
]) {
  test(`${name} is classified as transient and retried`, async () => {
    assert.equal(isTransientEmbeddingError(error), true);
    const harness = createHarness();
    const provider = embeddingProviderFor({ failThen: [error] });
    const delays = [];
    try {
      const result = await harness.ingest({ embeddingProvider: provider, sleep: async (delay) => delays.push(delay) });
      assert.equal(result.written, 2);
      assert.equal(provider.calls, 3);
      assert.deepEqual(delays, [1000]);
      assert.equal(harness.stored.size, 2);
    } finally {
      fs.rmSync(harness.directory, { recursive: true, force: true });
    }
  });
}

test("permanent authentication and malformed-response errors are not retried", async () => {
  for (const error of [
    Object.assign(new Error("Voyage API error (401): invalid API key"), { status: 401 }),
    new Error("Invalid Voyage embedding response"),
  ]) {
    assert.equal(isTransientEmbeddingError(error), false);
    const delays = [];
    let calls = 0;
    await assert.rejects(
      embedBatchWithRetry({ async embedBatch() { calls++; throw error; } }, ["input"], { sleep: async (delay) => delays.push(delay) }),
      error,
    );
    assert.equal(calls, 1);
    assert.deepEqual(delays, []);
  }
});

test("exhausted retries preserve existing data and report failed batch progress", async () => {
  const oldMuslim = existingHadithChunk("muslim", 1);
  const harness = createHarness({ muslimCount: 3, existing: [oldMuslim] });
  const transient = Object.assign(new Error("Connection reset"), { code: "ECONNRESET" });
  const provider = embeddingProviderFor({ failThen: [null, transient, transient, transient] });
  const delays = [];
  try {
    await assert.rejects(
      harness.ingest({ embeddingProvider: provider, retryDelaysMs: [1000, 2000], sleep: async (delay) => delays.push(delay) }),
      (error) => {
        assert.match(error.message, /Sahih Muslim, hadiths 2-3/);
        assert.match(error.message, /1\/3 already stored; 2 remaining/);
        assert.match(error.message, /No records from this failed embedding batch were written/);
        return true;
      },
    );
    assert.equal(provider.calls, 4);
    assert.deepEqual(delays, [1000, 2000]);
    assert.equal(harness.bulkWrites.length, 1); // Bukhari's successful record only.
    assert.equal(harness.stored.get(oldMuslim.chunkId).text, oldMuslim.text);
    assert.equal(harness.stored.get(oldMuslim.chunkId).embedding[0], 0.7);
    assert.equal(harness.stored.has("ahmedbaset-hadith-muslim-2"), false);
    assert.equal(harness.stored.has("ahmedbaset-hadith-muslim-3"), false);
  } finally {
    fs.rmSync(harness.directory, { recursive: true, force: true });
  }
});
