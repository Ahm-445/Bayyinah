const mongoose = require("mongoose");
const env = require("./env");

async function connectDB() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is required (set it in server/.env)");
  }

  // dbName is passed explicitly so Mongoose and the AI module
  // always use the same database.
  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName,
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
