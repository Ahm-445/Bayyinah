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

// Shape of a real tafsir chunk after the 3d075ba parser fix: the verse is only
// in metadata.reference / metadata.references (no surahNumber / ayahNumber).
const tafsirA170 = {
  sourceId: "quranpedia-tafsir-book-1",
  chunkId: "quranpedia-tafsir-book-1-p1-pg25-a170-0123456789ab",
  text: "وإلهكم إله واحد: إن إلهكم الذي يستحق العبادة إله واحد لا شريك له.",
  score: 0.91,
  citation: {
    category: "tafsir",
    sourceType: "tafsir",
    sourceTitle: "تيسير التفسير",
    language: "ar",
    reference: "Quran 2:163",
    references: [{ surahNumber: 2, ayahNumber: 163 }],
    globalAyahNumbers: [170],
  },
};
const ikhlas1 = {
  sourceId: "quran-source",
  chunkId: "quran-hafs-112-1",
  text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
  score: 0.93,
  citation: { sourceType: "quran", language: "ar", surahNumber: 112, ayahNumber: 1 },
};

test("a verse reference backed only by tafsir metadata.references is accepted", async () => {
  for (const evidence of [[tafsirA170], [ikhlas1, tafsirA170]]) {
    let calls = 0;
    const generator = createDraftGenerator({ llmProvider: { async generate() {
      calls += 1;
      return "التوحيد هو إفراد الله بالعبادة، فإلهكم إله واحد لا إله إلا هو (البقرة 2:163).";
    } } });
    const draft = await generator.generateDraft({ question: "ما معنى التوحيد؟", language: "ar", evidence });
    assert.match(draft.answer, /2:163/u);
    assert.equal(calls, 1, "the first draft must be accepted without a retry");
  }
});

test("a verse that is in neither the Quran evidence nor the tafsir references is still rejected", async () => {
  for (const evidence of [[tafsirA170], [ikhlas1, tafsirA170]]) {
    const generator = createDraftGenerator({ llmProvider: { async generate() {
      return "التوحيد هو إفراد الله بالعبادة (الماعون 107:3).";
    } } });
    await assert.rejects(
      generator.generateDraft({ question: "ما معنى التوحيد؟", language: "ar", evidence }),
      /not present in the evidence/u
    );
  }
});

test("tafsir reference ranges expand to every verse they cover", () => {
  const { evidenceVerseKeys, parseVerseReference } = require("./draftGenerator");
  assert.deepEqual(parseVerseReference("Quran 3:130–3:133"), ["3:130", "3:131", "3:132", "3:133"]);
  assert.deepEqual(parseVerseReference("Quran 3:130-133"), ["3:130", "3:131", "3:132", "3:133"]);
  assert.deepEqual(parseVerseReference("Quran 2:286–3:1"), ["2:286", "3:1"]);
  assert.deepEqual(evidenceVerseKeys({ citation: {
    sourceType: "tafsir", reference: "Quran 3:130–3:133",
    references: [{ surahNumber: 3, ayahNumber: 130 }, { surahNumber: 3, ayahNumber: 133 }],
  } }), ["3:130", "3:133", "3:131", "3:132"]);
  // Hadith references are never read as verses.
  assert.deepEqual(evidenceVerseKeys({ citation: { sourceType: "hadith", reference: "Book 2:13" } }), []);
});

test("inline references use Arabic surah names for Arabic and transliterated names for English", () => {
  const { buildInlineReferences, ARABIC_SURAH_NAMES } = require("../rag/citation/citationBuilder");
  assert.equal(ARABIC_SURAH_NAMES.length, 114);
  const verse = (surahNumber, ayahNumber) => ({ citation: { sourceType: "quran", surahNumber, ayahNumber } });
  // No surahName in the metadata: the name comes from the table, never "(القرآن 112:1)".
  assert.deepEqual(buildInlineReferences([verse(112, 1)], "ar"), ["(الإخلاص 112:1)"]);
  assert.deepEqual(buildInlineReferences([verse(112, 1)], "en"), ["(Al-Ikhlas 112:1)"]);
  assert.deepEqual(buildInlineReferences([verse(1, 1), verse(2, 255), verse(107, 3), verse(114, 6)], "ar"),
    ["(الفاتحة 1:1)", "(البقرة 2:255)", "(الماعون 107:3)", "(الناس 114:6)"]);
  // Tafsir chunks that carry the verse only in reference/references.
  assert.deepEqual(buildInlineReferences([tafsirA170], "ar"), ["(تفسير البقرة 2:163)"]);
  assert.deepEqual(buildInlineReferences([tafsirA170], "en"), ["(Tafsir on Al-Baqarah 2:163)"]);
  const range = { citation: { sourceType: "tafsir", reference: "Quran 3:130–3:133" } };
  assert.deepEqual(buildInlineReferences([range], "ar"), ["(تفسير آل عمران 3:130–133)"]);
});

test("an Arabic draft is not given English references when its wording differs from the canonical form", async () => {
  const cases = [
    ["التوحيد إفراد الله بالعبادة (سورة البقرة، الآية 163).", [tafsirA170], "(البقرة 2:163)"],
    ["التوحيد إفراد الله بالعبادة (البقرة ٢:١٦٣).", [tafsirA170], "(البقرة 2:163)"],
    ["قل هو الله أحد (القرآن 112:1) وإلهكم إله واحد (البقرة 2:163).", [ikhlas1, tafsirA170], "(الإخلاص 112:1)"],
  ];
  for (const [text, evidence, expected] of cases) {
    const generator = createDraftGenerator({ llmProvider: { async generate() { return text; } } });
    const draft = await generator.generateDraft({ question: "ما معنى التوحيد؟", language: "ar", evidence });
    assert.ok(draft.answer.includes(expected), draft.answer);
    assert.doesNotMatch(draft.answer, /[A-Za-z]/u, `English leaked into: ${draft.answer}`);
    assert.doesNotMatch(draft.answer, /القرآن \d/u);
  }
});

test("uncited evidence is appended in the draft's language", async () => {
  const arabic = createDraftGenerator({ llmProvider: { async generate() { return "التوحيد إفراد الله بالعبادة."; } } });
  const arabicDraft = await arabic.generateDraft({ question: "ما معنى التوحيد؟", language: "ar", evidence: [tafsirA170] });
  assert.equal(arabicDraft.answer, "التوحيد إفراد الله بالعبادة. (تفسير البقرة 2:163)");

  const english = createDraftGenerator({ llmProvider: { async generate() {
    return "Say: He is Allah, the One (Quran 112:1).";
  } } });
  const englishDraft = await english.generateDraft({ question: "What is tawhid?", language: "en", evidence: [ikhlas1] });
  assert.match(englishDraft.answer, /\(Al-Ikhlas 112:1\)\.$/u, "cited once, not appended again");
});

test("the generation prompt forbids Markdown, addressing the reader, closing offers and unsupported summaries", async () => {
  const { buildGenerationPrompt } = require("../prompts/generationPrompt");
  for (const language of ["ar", "en"]) {
    let sentPrompt;
    const generator = createDraftGenerator({ llmProvider: { async generate(prompt) {
      sentPrompt = prompt;
      return language === "ar" ? "إلهكم إله واحد (البقرة 2:163)." : "Your God is one God (Al-Baqarah 2:163).";
    } } });
    await generator.generateDraft({ question: language === "ar" ? "ما معنى التوحيد؟" : "What is tawhid?", language, evidence: [tafsirA170] });
    assert.equal(sentPrompt, buildGenerationPrompt({
      question: language === "ar" ? "ما معنى التوحيد؟" : "What is tawhid?", language, evidence: [tafsirA170],
    }));
    for (const rule of [
      /Write plain text only\. Do not use Markdown: no \*\*bold\*\*.*no bullet or numbered lists, no headings/u,
      /Do not address the reader about the evidence.*"The evidence you provided"/u,
      /Do not end with an offer.*"If you'd like, I can also explain…".*"إذا أحببت، أستطيع…"/u,
      /Do not add a concluding or summary sentence unless every part of it is directly supported by the evidence/u,
      /Tafsir evidence may give its verses only as a Reference such as "Quran 2:163"/u,
      /Reference: Quran 2:163/u,
    ]) assert.match(sentPrompt, rule);
  }
});
