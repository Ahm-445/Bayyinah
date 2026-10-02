require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../.env"),
});
const {
  createVoyageEmbeddingProvider,
  MODEL,
  DIMENSIONS,
} = require("./voyageEmbeddingProvider");

async function main() {
  const provider = createVoyageEmbeddingProvider();

  const arabic = await provider.embed(
    "ما هو التوحيد في الإسلام؟",
    { inputType: "query" }
  );

  const english = await provider.embed(
    "What is Tawhid in Islam?",
    { inputType: "query" }
  );

  console.log("\nMODEL:");
  console.log(MODEL);

  console.log("\nARABIC:");
  console.log({
    dimensions: arabic.length,
    expected: DIMENSIONS,
    valid: arabic.length === DIMENSIONS,
  });

  console.log("\nENGLISH:");
  console.log({
    dimensions: english.length,
    expected: DIMENSIONS,
    valid: english.length === DIMENSIONS,
  });

  console.log("\nASSERTIONS:");

  console.log(
    "Arabic embedding: ",
    arabic.length === DIMENSIONS ? "✅" : "❌"
  );

  console.log(
    "English embedding:",
    english.length === DIMENSIONS ? "✅" : "❌"
  );

  console.log(
    "Arabic values valid:",
    arabic.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    )
      ? "✅"
      : "❌"
  );

  console.log(
    "English values valid:",
    english.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    )
      ? "✅"
      : "❌"
  );
}

main().catch((error) => {
  console.error("\n❌ TEST FAILED\n");
  console.error(error.message);
  process.exit(1);
});
