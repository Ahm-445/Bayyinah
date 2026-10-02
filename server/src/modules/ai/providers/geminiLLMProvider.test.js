require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../.env"),
});

const {
  createGeminiLLMProvider,
} = require("./geminiLLMProvider");

async function main() {
  const provider = createGeminiLLMProvider();

  const response = await provider.generate(
    "Answer in one short sentence: What is Tawhid in Islam?",
    {
      temperature: 0.2,
    }
  );

  console.log("\nGEMINI RESPONSE:\n");
  console.log(response);

  console.log("\nASSERTIONS:\n");

  console.log(
    "Response returned:",
    response ? "✅" : "❌"
  );
}

main().catch((error) => {
  console.error("\nTEST FAILED:\n");
  console.error(error);
  process.exit(1);
});