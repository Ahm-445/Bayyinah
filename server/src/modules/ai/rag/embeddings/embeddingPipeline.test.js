const {
  embedChunk,
} = require("./embeddingPipeline");

async function main() {
  let receivedInputType = null;

  const fakeProvider = {
    async embed(text, options = {}) {
      receivedInputType = options.inputType;

      console.log("Text:", text);
      console.log("Input type:", options.inputType);

      return [0.1, 0.2, 0.3];
    },
  };

  const fakeChunk = {
    chunkId: "source-001-chunk-0001",
    sourceId: "source-001",
    text: "Islam teaches the worship of one God.",
    metadata: {
      sourceTitle: "Test Source",
      language: "en",
    },
  };

  const result = await embedChunk(
    fakeChunk,
    fakeProvider,
    "voyage-4-large"
  );

  console.log("\nRESULT:\n");
  console.dir(result, { depth: null });

  console.log("\nASSERTIONS:\n");

  console.log(
    "Document input type:",
    receivedInputType === "document" ? "✅" : "❌"
  );

  console.log(
    "Embedding exists:",
    Array.isArray(result.embedding) ? "✅" : "❌"
  );

  console.log(
    "Model preserved:",
    result.model === "voyage-4-large" ? "✅" : "❌"
  );

  console.log(
    "Dimensions correct:",
    result.dimensions === 3 ? "✅" : "❌"
  );
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED\n");
  console.error(error);
  process.exit(1);
});
