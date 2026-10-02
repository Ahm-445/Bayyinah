const {
  createEmbeddingProvider,
} = require("./embeddingProvider");

async function main() {
  const fakeProvider = {
    async embed(text) {
      console.log("Embedding:", text);

      return [0.12, 0.34, 0.56, 0.78];
    },
  };

  const embeddingProvider = createEmbeddingProvider(fakeProvider);

  const vector = await embeddingProvider.embed(
    "What is Islam?"
  );

  console.log("\nVECTOR:\n");
  console.log(vector);

  console.log("\nASSERTIONS:\n");

  console.log(
    "Is array:",
    Array.isArray(vector) ? "✅" : "❌"
  );

  console.log(
    "Has dimensions:",
    vector.length > 0 ? "✅" : "❌"
  );

  console.log(
    "All values are numbers:",
    vector.every((value) => typeof value === "number")
      ? "✅"
      : "❌"
  );
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED\n");
  console.error(error);
  process.exit(1);
});
