require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../../.env"),
});

const { connectMongo, closeMongo } = require("./mongoClient");
const {
  createVectorIndex,
  INDEX_NAME,
} = require("./vectorIndex");

async function main() {
  try {
    const db = await connectMongo();

    const result = await createVectorIndex(db);

    console.log("Vector index creation result:");
    console.log(result);

    console.log("\nASSERTIONS:");

    console.log(
      "Index name:",
      result === INDEX_NAME ? "✅" : "⚠️"
    );

    console.log(
      "Expected name:",
      INDEX_NAME
    );

    await closeMongo();
  } catch (error) {
    console.error("\n❌ TEST FAILED\n");
    console.error(error);
    process.exit(1);
  }
}

main();
