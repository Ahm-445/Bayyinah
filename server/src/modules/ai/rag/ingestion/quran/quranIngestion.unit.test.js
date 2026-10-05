const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  SOURCE_ID,
} = require("./quranChunkBuilder");

async function main() {
  // The central source of truth for the Quran source id.
  assert.strictEqual(SOURCE_ID, "quranpedia-quran-hafs");

  const ingPath = path.join(__dirname, "quranIngestion.js");
  const ing = fs.readFileSync(ingPath, "utf8");
  assert.ok(/SOURCE_ID/.test(ing), "quranIngestion.js must use SOURCE_ID");
  assert.ok(
    !/quran-quranpedia-hafs/.test(ing),
    "the wrong literal must not appear in quranIngestion.js"
  );

  const fullPath = path.join(__dirname, "quranFullIngestion.js");
  const full = fs.readFileSync(fullPath, "utf8");
  assert.ok(
    full.includes("sourceId: SOURCE_ID"),
    "quranFullIngestion.js must use SOURCE_ID"
  );
  assert.ok(
    !/"quranpedia-quran-hafs"/.test(full),
    "quranFullIngestion.js must not hard-code the source id"
  );

  console.log("quranIngestion unit test: PASSED");
}

main().catch((error) => {
  console.error("quranIngestion unit test: FAILED");
  console.error(error);
  process.exit(1);
});
