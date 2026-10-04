require("dotenv").config();

const path = require("path");
const { connectMongo, closeMongo } = require("../../storage/mongoClient");
const { createVoyageEmbeddingProvider } = require("../../embeddings/voyageEmbeddingProvider");
const { ingestTafsir } = require("./tafsirIngestion");

function readOptions(argv) {
  const options = { dryRun: false, file: path.resolve(__dirname, "../../../../../../data/tafsir/tafsir-book-1.json.gz") };
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--dry-run") { options.dryRun = true; continue; }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const separator = token.indexOf("=");
    const key = token.slice(2, separator === -1 ? undefined : separator);
    const value = separator === -1 ? argv[++index] : token.slice(separator + 1);
    if (!value) throw new Error(`Missing value for --${key}`);
    if (key !== "file" && key !== "batch-size") throw new Error(`Unknown option --${key}`);
    options[key] = value;
  }
  return options;
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const filePath = path.resolve(options.file);
  const db = options.dryRun ? undefined : await connectMongo();
  try {
    const result = await ingestTafsir({
      filePath,
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
    console.error("Quranpedia tafsir ingestion FAILED");
    console.error(error);
    try { await closeMongo(); } catch {}
    process.exitCode = 1;
  });
}

module.exports = { readOptions };
