require("dotenv").config();

const path = require("path");
const { connectMongo, closeMongo } = require("../../storage/mongoClient");
const { createVoyageEmbeddingProvider } = require("../../../providers/voyageEmbeddingProvider");
const { ingestHadith } = require("./hadithIngestion");

function readOptions(argv) {
  const options = { dryRun: false, approved: false };
  const valueOptions = new Set(["bukhari-file", "muslim-file", "source-version", "usage-basis", "batch-size"]);
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--dry-run") { options.dryRun = true; continue; }
    if (token === "--approved") { options.approved = true; continue; }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const separator = token.indexOf("=");
    const key = token.slice(2, separator === -1 ? undefined : separator);
    if (!valueOptions.has(key)) throw new Error(`Unknown option --${key}`);
    const value = separator === -1 ? argv[++index] : token.slice(separator + 1);
    if (!value) throw new Error(`Missing value for --${key}`);
    options[key] = value;
  }
  return options;
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  if (!options["bukhari-file"] || !options["muslim-file"]) {
    throw new Error("Provide --bukhari-file and --muslim-file; use --dry-run to validate files without embeddings or MongoDB writes");
  }
  const bukhariFile = path.resolve(options["bukhari-file"]);
  const muslimFile = path.resolve(options["muslim-file"]);
  if (!options.dryRun && (!options.approved || !options["usage-basis"] || !options["source-version"])) {
    throw new Error("Actual ingestion requires --approved, --usage-basis, and --source-version after you verify usage rights and the matching repository tag/commit");
  }
  const sourceMetadata = options.dryRun ? undefined : {
    version: options["source-version"],
    usageBasis: options["usage-basis"],
    approved: options.approved,
  };
  let db;
  try {
    db = await connectMongo();
    const result = await ingestHadith({
      bukhariFile,
      muslimFile,
      sourceMetadata,
      db,
      embeddingProvider: options.dryRun ? undefined : createVoyageEmbeddingProvider(),
      batchSize: Number(options["batch-size"] || 8),
      dryRun: options.dryRun,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (db) await closeMongo();
  }
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error("Bukhari and Muslim ingestion FAILED");
    console.error(error);
    try { await closeMongo(); } catch {}
    process.exitCode = 1;
  });
}

module.exports = { readOptions };
