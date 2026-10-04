const assert = require("assert");
const { createSource } = require("./sourceContract");

const source = createSource({
  sourceId: "hadith-example",
  title: "Verified Hadith Collection",
  type: "hadith",
  language: "AR",
  reference: "Collection and hadith number",
  url: "https://example.org/hadith",
  version: "2026-10",
  license: "Permitted for in-app use",
  approved: true,
});

assert.strictEqual(source.type, "hadith");
assert.strictEqual(source.language, "ar");
assert.strictEqual(source.version, "2026-10");
assert.strictEqual(source.license, "Permitted for in-app use");
assert.strictEqual(source.approved, true);

assert.throws(
  () => createSource({ ...source, url: undefined }),
  /Source URL is required/
);
assert.throws(
  () => createSource({ ...source, version: undefined }),
  /Source version is required/
);
assert.throws(
  () => createSource({ ...source, license: null, usageBasis: null }),
  /Source license or usage basis is required/
);
assert.throws(
  () => createSource({ ...source, usageBasis: 12 }),
  /Source usage basis must be a string/
);
assert.throws(
  () => createSource({ ...source, license: "   ", usageBasis: "   " }),
  /Source license or usage basis is required/
);
assert.throws(
  () => createSource({ ...source, approved: false }),
  /Source is not approved/
);

console.log("Source approval and provenance tests: PASSED");
