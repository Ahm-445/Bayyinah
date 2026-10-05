require("dotenv").config();

const { connectMongo, closeMongo } = require("../../storage/mongoClient");
const { createVoyageEmbeddingProvider } = require("../../../providers/voyageEmbeddingProvider");
const { ingestSaheehInternational } = require("./saheehInternationalIngestion");
const { createSaheehInternationalSource } = require("./saheehInternationalChunkBuilder");

function readOptions(argv) {
  const options = { approved: false, dryRun: false };
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (token === "--approved") {
      options.approved = true;
      continue;
    }
    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const separator = token.indexOf("=");
    const key = token.slice(2, separator === -1 ? undefined : separator);
    const value = separator === -1 ? argv[++index] : token.slice(separator + 1);
    if (!value) throw new Error(`Missing value for --${key}`);
    options[key] = value;
  }
  return options;
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const filePath = options.file;
  const sourceMetadata = {
    url: options["source-url"],
    version: options["source-version"],
    license: options.license,
    usageBasis: options["usage-basis"],
    approved: options.approved,
  };

  if (!filePath || !sourceMetadata.url || !sourceMetadata.version || (!sourceMetadata.license && !sourceMetadata.usageBasis)) {
    throw new Error("Provide --file, --source-url, --source-version, and either --license or --usage-basis");
  }
  createSaheehInternationalSource(sourceMetadata);

  let db;
  try {
    if (!options.dryRun) {
      db = await connectMongo();
    }
    const result = await ingestSaheehInternational({
      filePath,
      sourceMetadata,
      db,
      embeddingProvider: options.dryRun ? undefined : createVoyageEmbeddingProvider(),
      batchSize: Number(options["batch-size"] || 32),
      dryRun: options.dryRun,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (db) await closeMongo();
  }
}

main().catch((error) => {
  console.error("Saheeh International ingestion FAILED");
  console.error(error);
  process.exitCode = 1;
});
