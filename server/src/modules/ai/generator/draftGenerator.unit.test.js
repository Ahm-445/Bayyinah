const assert = require("assert");

const {
  createDraftGenerator,
} = require("./draftGenerator");

async function main() {
  const llmProvider = {
    generate: async () => "هذه مسودة الجواب المقترح.",
  };

  const generator = createDraftGenerator({ llmProvider });

  const evidence = [
    {
      sourceId: "quranpedia-quran-hafs",
      chunkId: "quran-hafs-2-255",
      text: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
      score: 0.9,
      citation: {
        sourceId: "quranpedia-quran-hafs",
        chunkId: "quran-hafs-2-255",
        sourceTitle: "القرآن الكريم - حفص عن عاصم",
        reference: "البقرة، الآية 255",
      },
    },
  ];

  const draft = await generator.generateDraft({
    question: "ما هو التوحيد؟",
    language: "ar",
    evidence,
  });

  assert.strictEqual(draft.citations.length, 1);
  assert.strictEqual(draft.citations[0].sourceId, "quranpedia-quran-hafs");
  assert.strictEqual(draft.citations[0].chunkId, "quran-hafs-2-255");
  assert.strictEqual(draft.citations[0].sourceTitle, "القرآن الكريم - حفص عن عاصم");
  assert.strictEqual(draft.citations[0].reference, "البقرة، الآية 255");

  console.log("draftGenerator unit test: PASSED");
}

main().catch((error) => {
  console.error("draftGenerator unit test: FAILED");
  console.error(error);
  process.exit(1);
});
