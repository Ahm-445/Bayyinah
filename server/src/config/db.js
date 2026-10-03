const mongoose = require("mongoose");
const env = require("./env");

async function connectDB() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is required (set it in server/.env)");
  }
  await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
