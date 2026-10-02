const { MongoClient } = require("mongodb");

let client = null;
let db = null;

async function connectMongo() {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  const dbName = process.env.MONGODB_DB_NAME || "bayyinah";

  client = new MongoClient(uri);

  await client.connect();

  db = client.db(dbName);

  return db;
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connectMongo,
  closeMongo,
};
