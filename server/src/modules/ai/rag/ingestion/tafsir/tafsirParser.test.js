const assert = require("assert");

const {
  parseTafsirDump,
  extractTafsirAyahs,
} = require("./tafsirParser");

const DUMP_PATH = "data/tafsir/tafsir-book-1.json.gz";

function main() {
  console.log("Loading tafsir dump...");

  const dump = parseTafsirDump(DUMP_PATH);
  const ayahs = extractTafsirAyahs(dump);

  console.log("Book:", dump.book.name);
  console.log("Author:", dump.book.author.full_name);
  console.log("Version:", dump.license.version);
  console.log("Ayahs:", ayahs.length);

  assert.strictEqual(
    dump.book.id,
    1
  );

  assert.strictEqual(
    dump.book.author.full_name,
    "إبراهيم القطان"
  );

  assert.strictEqual(
    ayahs.length,
    6236
  );

  console.log("\nFirst tafsir:");
  console.log(ayahs[0]);

  console.log("\nLast tafsir:");
  console.log(ayahs[ayahs.length - 1]);

  console.log(
    "\nTafsir parser test: PASSED ✅"
  );
}

try {
  main();
} catch (error) {
  console.error(
    "\nTafsir parser test: FAILED ❌"
  );

  console.error(error);
  process.exit(1);
}