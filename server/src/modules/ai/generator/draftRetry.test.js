const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createDraftGenerator,
  MAX_GENERATION_ATTEMPTS,
} = require("./draftGenerator");

const evidence = [
  {
    sourceId: "quran-source",
    chunkId: "quran-hafs-112-1",
    text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    score: 0.95,
    citation: {
      sourceType: "quran",
      surahNumber: 112,
      ayahNumber: 1,
      surahName: "سورة الإخلاص",
    },
  },
];

/** A generator whose LLM returns the given answers in order (the last one repeats). */
function generatorReturning(answers) {
  let calls = 0;
  const generator = createDraftGenerator({
    llmProvider: {
      async generate() {
        const answer = answers[Math.min(calls, answers.length - 1)];
        calls += 1;
        if (answer instanceof Error) throw answer;
        return answer;
      },
    },
  });

  return { generator, calls: () => calls };
}

const ask = (generator, language = "ar") =>
  generator.generateDraft({ question: "ما معنى التوحيد؟", language, evidence });

test("retries once when the first draft cites a verse that is not in the evidence", async () => {
  const { generator, calls } = generatorReturning([
    "هذا مدعوم بقوله تعالى (الفاتحة 1:1).",
    "التوحيد هو الإيمان بالله وحده (الإخلاص 112:1).",
  ]);

  const draft = await ask(generator);

  assert.equal(calls(), 2);
  assert.match(draft.answer, /\(الإخلاص 112:1\)/u);
  assert.doesNotMatch(draft.answer, /1:1/u);
});

test("retries a draft written in the wrong language", async () => {
  const { generator, calls } = generatorReturning([
    "This answer is only in English.",
    "التوحيد هو الإيمان بالله وحده.",
  ]);

  const draft = await ask(generator);

  assert.equal(calls(), 2);
  assert.equal(draft.language, "ar");
});

test("still rejects an invented reference when every attempt is invalid", async () => {
  const { generator, calls } = generatorReturning(["هذا مدعوم (الفاتحة 1:1)."]);

  await assert.rejects(ask(generator), /not present in the evidence/u);
  assert.equal(calls(), MAX_GENERATION_ATTEMPTS);
});

test("does not retry provider errors", async () => {
  const { generator, calls } = generatorReturning([new Error("rate limited")]);

  await assert.rejects(ask(generator), /rate limited/u);
  assert.equal(calls(), 1);
});

test("does not call the model again when the first draft is valid", async () => {
  const { generator, calls } = generatorReturning([
    "التوحيد هو الإيمان بالله وحده (الإخلاص 112:1).",
  ]);

  await ask(generator);

  assert.equal(calls(), 1);
});
