const path = require("path");

// The .env file lives in server/ (the AI module loads the same file).
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  clientOrigin:
    process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI,
  // Must match the database the AI module reads knowledge_chunks from.
  mongodbDbName: process.env.MONGODB_DB_NAME || "bayyinah",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

env.isProduction = env.nodeEnv === "production";

module.exports = env;
