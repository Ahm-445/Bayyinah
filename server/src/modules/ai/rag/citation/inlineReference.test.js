const test = require("node:test");
const assert = require("node:assert/strict");

const { buildInlineReference } = require("./citationBuilder");
const { createDraftGenerator } = require("../../generator/draftGenerator");

const hadith = (reference) => ({
  citation: {
    sourceType: "hadith",
    sourceTitle: "Sahih al-Bukhari",
    reference,
  },
});

test("a reference that already starts with the source title is not repeated", () => {
  assert.equal(
    buildInlineReference(hadith("Sahih al-Bukhari 7270")),
    "(Sahih al-Bukhari 7270)"
  );
});

test("a reference without the title keeps the title in front", () => {
  assert.equal(
    buildInlineReference(hadith("Book 1, hadith 1")),
    "(Sahih al-Bukhari, Book 1, hadith 1)"
  );
});

test("title or reference alone still works", () => {
  assert.equal(
    buildInlineReference({ citation: { sourceTitle: "Sahih Muslim" } }),
    "(Sahih Muslim)"
  );
  assert.equal(buildInlineReference({ citation: { reference: "Muslim 38" } }), "(Muslim 38)");
  assert.equal(buildInlineReference({ citation: {} }), null);
});

test("a draft that already cites the hadith inline gets no repeated reference appended", async () => {
  const generator = createDraftGenerator({
    llmProvider: {
      async generate() {
        return "Actions are judged by intentions (Sahih al-Bukhari 7270).";
      },
    },
  });

  const draft = await generator.generateDraft({
    question: "What did the Prophet say about intentions?",
    language: "en",
    evidence: [
      {
        sourceId: "hadith-bukhari",
        chunkId: "ahmedbaset-hadith-bukhari-7270",
        text: "Actions are judged by intentions.",
        score: 0.9,
        citation: {
          sourceType: "hadith",
          sourceTitle: "Sahih al-Bukhari",
          reference: "Sahih al-Bukhari 7270",
        },
      },
    ],
  });

  assert.equal(draft.answer.match(/Sahih al-Bukhari/gu).length, 1);
});
