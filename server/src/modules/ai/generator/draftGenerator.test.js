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

test("Arabic and English Quran drafts include evidence-backed in-text verse references", async () => {
  const evidence = [{
    sourceId: "quran-source",
    chunkId: "quran-hafs-112-1",
    text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    score: 0.95,
    citation: {
      sourceType: "quran",
      language: "ar",
      surahName: "سورة الإخلاص",
      surahNumber: 112,
      ayahNumber: 1,
      reference: "سورة الإخلاص، الآية 1",
    },
  }];
  const arabic = createDraftGenerator({ llmProvider: { async generate() { return "الإسلام يقوم على عبادة الله وحده."; } } });
  const arabicDraft = await arabic.generateDraft({ question: "ما هو الإسلام؟", language: "ar", evidence });
  assert.match(arabicDraft.answer, /\(الإخلاص 112:1\)/u);
  assert.equal(arabicDraft.language, "ar");

  const english = createDraftGenerator({ llmProvider: { async generate() { return "Islam teaches worship of Allah alone."; } } });
  const englishDraft = await english.generateDraft({ question: "What is Islam?", language: "en", evidence });
  assert.match(englishDraft.answer, /\(Al-Ikhlas 112:1\)/u);
  assert.equal(englishDraft.language, "en");
});

test("a draft in the wrong language fails closed and invented Quran verse references are rejected", async () => {
  const evidence = [{
    sourceId: "quran-source",
    chunkId: "quran-hafs-112-1",
    text: "Quran evidence",
    score: 0.95,
    citation: { sourceType: "quran", surahNumber: 112, ayahNumber: 1 },
  }];
  const englishOnly = createDraftGenerator({ llmProvider: { async generate() { return "This answer is only in English."; } } });
  await assert.rejects(
    englishOnly.generateDraft({ question: "ما هو الإسلام؟", language: "ar", evidence }),
    /does not match the question language/u
  );

  const inventedVerse = createDraftGenerator({ llmProvider: { async generate() { return "This is supported (Quran 113:4)."; } } });
  await assert.rejects(
    inventedVerse.generateDraft({ question: "What is Islam?", language: "en", evidence }),
    /not present in the evidence/u
  );
});

test("non-Quran evidence uses its source reference without a surah:ayah citation", async () => {
  const generator = createDraftGenerator({ llmProvider: { async generate() { return "The report describes the teaching."; } } });
  const draft = await generator.generateDraft({
    question: "What does the hadith teach?",
    language: "en",
    evidence: [{
      sourceId: "hadith-source",
      chunkId: "bukhari-1",
      text: "Hadith text",
      score: 0.9,
      citation: { sourceType: "hadith", sourceTitle: "Sahih al-Bukhari", reference: "Book 1, hadith 1" },
    }],
  });
  assert.match(draft.answer, /\(Sahih al-Bukhari, Book 1, hadith 1\)/u);
  assert.doesNotMatch(draft.answer, /\d{1,3}:\d{1,3}/u);
});
