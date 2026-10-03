const assert = require("node:assert/strict");
const test = require("node:test");
const { createDraftGenerator, ENGLISH_ARABIC_TAFSIR_NOTICE } = require("./draftGenerator");

test("English Al-Fatihah tafsir answer starts with a clear Arabic-tafsir explanation notice", async () => {
  let generationOptions;
  const generator = createDraftGenerator({
    llmProvider: {
      async generate(_prompt, options) {
        generationOptions = options;
        return "The opening praises Allah and describes Him as merciful.";
      },
    },
  });
  const draft = await generator.generateDraft({
    question: "What does the beginning of Surah Al-Fatihah mean?",
    language: "en",
    evidence: [{
      sourceId: "tafsir-source",
      chunkId: "tafsir-1",
      text: "Arabic tafsir excerpt",
      citation: { sourceType: "tafsir", language: "ar" },
    }],
  });
  assert.ok(draft.answer.startsWith(ENGLISH_ARABIC_TAFSIR_NOTICE));
  assert.match(draft.answer.split(".", 1)[0], /English explanation.*Arabic source/);
  assert.match(draft.answer.split(".", 1)[0], /not an English source quotation/);
  assert.equal(draft.language, "en");
  assert.equal(generationOptions.maxOutputTokens, 1200);
  assert.equal(generationOptions.taskType, "draft_generation");
});

test("English tafsir notice does not alter Arabic drafts or non-tafsir sources", async () => {
  const generator = createDraftGenerator({ llmProvider: { async generate() { return "An answer."; } } });
  const draft = await generator.generateDraft({
    question: "What is this?",
    language: "en",
    evidence: [{ sourceId: "quran", chunkId: "q-1", text: "Text", citation: { sourceType: "quran", language: "ar" } }],
  });
  assert.equal(draft.answer, "An answer.");
});
