require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../../.env"),
});

const {
  connectMongo,
  closeMongo,
} = require("./mongoClient");

async function main() {
  try {
    const db = await connectMongo();

    await db.command({ ping: 1 });

    console.log("MongoDB connection: ✅");
    console.log("Database:", db.databaseName);

    await closeMongo();
  } catch (error) {
    console.error("MongoDB connection: ❌");
    console.error(error.message);
    process.exit(1);
  }
}

main();
