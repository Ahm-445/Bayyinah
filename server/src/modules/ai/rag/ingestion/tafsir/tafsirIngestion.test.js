const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { ingestTafsir } = require("./tafsirIngestion");

test("tafsir ingestion embeds deduplicated blocks in batches and upserts validated vectors", async () => {
  const filePath = path.resolve(__dirname, "../../../../../../data/tafsir/tafsir-book-1.json.gz");
  const stored = new Map();
  const batchLengths = [];
  const collection = {
    async bulkWrite(operations) {
      for (const operation of operations) {
        const document = operation.updateOne.update.$set;
        stored.set(document.chunkId, document);
      }
    },
    async countDocuments(filter) {
      const matches = [...stored.values()].filter((document) => document.sourceId === filter.sourceId);
      if (filter.dimensions && filter.dimensions.$ne !== undefined) return matches.filter((document) => document.dimensions !== filter.dimensions.$ne).length;
      return matches.length;
    },
  };
  const result = await ingestTafsir({
    filePath,
    db: { collection: () => collection },
    batchSize: 32,
    embeddingProvider: {
      async embedBatch(texts, options) {
        assert.equal(options.inputType, "document");
        batchLengths.push(texts.length);
        return texts.map(() => Array(1024).fill(0.125));
      },
    },
  });

  assert.equal(result.ayahRows, 6236);
  assert.equal(result.planned, 1460);
  assert.equal(result.written, 1460);
  assert.equal(result.storedCount, 1460);
  assert.equal(result.invalidDimensions, 0);
  assert.equal(stored.size, 1460);
  assert.equal(batchLengths.length, 46);
  assert.equal(batchLengths.at(-1), 20);
  const first = [...stored.values()][0];
  assert.equal(first.metadata.category, "tafsir");
  assert.match(first.metadata.reference, /^Quran /);
  assert.equal(first.dimensions, 1024);
});

// Quranpedia book 4: al-Tabari, Jami' al-Bayan (d. 310 AH), the tafsir of the first
// three centuries listed by the scientific package. Same dump format as book 1.
test("al-Tabari (book 4) ingests as its own source and long passages are split", async () => {
  const fs = require("fs");
  const os = require("os");
  const zlib = require("zlib");
  const { MAX_CHUNK_CHARACTERS, getTafsirBook } = require("./tafsirChunkBuilder");
  const sentence = "قال أبو جعفر: يعني بذلك جل ثناؤه أن إلهكم إله واحد لا شريك له. ";
  const longText = Array.from({ length: 6 }, () => sentence.repeat(30)).join("<br />");
  const dump = {
    license: { version: "2026-10-02", en: "Quranpedia usage terms" },
    book: { id: 4, name: "جامع البيان في تأويل آي القرآن", author: { full_name: "محمد بن جرير الطبري" }, language: { code: "ar" } },
    ayahs: [
      { surah: 2, ayah: 163, content: [{ text: longText, part: 3, page: 268, ayahs: "1" }] },
      { surah: 112, ayah: 1, content: [{ text: "<span>﴿قل هو الله أحد﴾</span> قال أبو جعفر: يقول تعالى ذكره…", part: 24, page: 727, ayahs: "2" }] },
    ],
  };
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tabari-")), "tafsir-book-4.json.gz");
  fs.writeFileSync(filePath, zlib.gzipSync(JSON.stringify(dump)));

  // Book id must match the dump.
  await assert.rejects(ingestTafsir({ filePath, dryRun: true }), /book 1 metadata/);

  const { parseTafsirFile } = require("./tafsirParser");
  assert.throws(() => parseTafsirFile(filePath, { expectedBookId: 4 }), /6236 ayah rows/, "the real dump must cover every ayah");
  const parsed = parseTafsirFile(filePath, { expectedBookId: 4, expectedAyahCount: 2 });
  assert.equal(parsed.blocks.length, 2);

  // The fixture has 2 rows instead of 6236, so build chunks the way prepareTafsirIngestion does.
  const { createTafsirSource, buildTafsirChunks } = require("./tafsirChunkBuilder");
  const source = createTafsirSource({ version: parsed.license.version, usageBasis: parsed.license.en, bookId: 4 });
  const chunks = parsed.blocks.flatMap((block) => buildTafsirChunks(block, source));

  assert.equal(source.sourceId, "quranpedia-tafsir-book-4");
  assert.equal(getTafsirBook(4).url, "https://api.quranpedia.net/dumps/tafsir-book-4.json.gz");
  const long = chunks.filter((chunk) => chunk.metadata.reference === "Quran 2:163");
  assert.ok(long.length > 1, "a long passage is split");
  assert.ok(long.every((chunk) => chunk.text.length <= MAX_CHUNK_CHARACTERS));
  assert.equal(long.map((chunk) => chunk.text).join("\n").replace(/\s+/g, ""), parsed.blocks[0].text.replace(/\s+/g, ""), "no text is lost");
  assert.deepEqual(long.map((chunk) => chunk.metadata.segment), long.map((_, index) => index + 1));
  assert.ok(long.every((chunk) => /-s\d+$/.test(chunk.chunkId) && chunk.chunkId.startsWith("quranpedia-tafsir-book-4-p3-pg268-a1-")));
  assert.equal(new Set(chunks.map((chunk) => chunk.chunkId)).size, chunks.length, "chunk ids are unique");
  const short = chunks.find((chunk) => chunk.metadata.reference === "Quran 112:1");
  assert.doesNotMatch(short.chunkId, /-s\d+$/);
  for (const chunk of chunks) {
    assert.equal(chunk.metadata.sourceType, "tafsir");
    assert.equal(chunk.metadata.sourceTitle, "جامع البيان في تأويل آي القرآن");
    assert.equal(chunk.metadata.author, "محمد بن جرير الطبري");
    assert.equal(chunk.metadata.authorDeathYearHijri, 310);
    assert.equal(chunk.metadata.approved, true);
  }

  assert.throws(() => require("./tafsirChunkBuilder").getTafsirBook(27785), /Unsupported Quranpedia tafsir book/);
  const { readOptions } = require("./tafsirFullIngestion");
  assert.match(readOptions(["--book", "4", "--dry-run"]).file, /data\/tafsir\/tafsir-book-4\.json\.gz$/);
  assert.match(readOptions(["--dry-run"]).file, /tafsir-book-1\.json\.gz$/);
});
