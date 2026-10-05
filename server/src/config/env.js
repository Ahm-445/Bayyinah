const path = require("path");

// The .env file lives in server/ (the AI module loads the same file).
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** True when the real AI pipeline has every key it needs. */
function hasRealAIKeys() {
  const provider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  const llmKey =
    provider === "gemini"
      ? process.env.GEMINI_API_KEY
      : process.env.OPENAI_API_KEY;

  return Boolean(llmKey && process.env.VOYAGE_API_KEY);
}

// AI_MODE=real  -> use modules/ai (needs OpenAI/Gemini + Voyage keys)
// AI_MODE=mock  -> canned results, lets the Frontend work without keys
// unset         -> real when the keys exist, otherwise mock
const aiMode = (
  process.env.AI_MODE || (hasRealAIKeys() ? "real" : "mock")
).toLowerCase();

const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT) || 5000,
  // One or more allowed frontend origins, comma separated. In production the
  // deployed Render frontend is the default; CLIENT_ORIGIN overrides it.
  clientOrigins: splitList(
    process.env.CLIENT_ORIGIN ||
      (isProduction ? "https://bayyinah-frontend.onrender.com" : "http://localhost:5173")
  ),
  mongodbUri: process.env.MONGODB_URI,
  // Must match the database the AI module reads knowledge_chunks from.
  mongodbDbName: process.env.MONGODB_DB_NAME || "bayyinah",
  jwtSecret:
    process.env.JWT_SECRET ||
    (isProduction ? undefined : "dev-only-insecure-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  aiMode,
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 90000,
  seedPassword: process.env.SEED_PASSWORD,
  // Behind Render's proxy set TRUST_PROXY=1 so req.ip is the real client
  // (otherwise everyone shares the proxy's address and the limits below hit all users).
  trustProxy: process.env.TRUST_PROXY
    ? Number(process.env.TRUST_PROXY)
    : isProduction
      ? 1
      : false,
  // Every question costs OpenAI/Voyage credit, so the public demo is limited.
  rateLimits: {
    loginMax: Number(process.env.RATE_LOGIN_MAX) || 30, // per IP, 15 minutes
    loginWindowMs: 15 * 60 * 1000,
    registerMax: Number(process.env.RATE_REGISTER_MAX) || 20, // per IP, 1 hour
    registerWindowMs: 60 * 60 * 1000,
    questionMax: Number(process.env.RATE_QUESTIONS_MAX) || 20, // per account, 1 hour
    questionWindowMs: 60 * 60 * 1000,
  },
};

/** Fails fast on configuration that must never be missing in production. */
env.assertValid = function assertValid() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is required (set it in server/.env)");
  }

  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is required in production");
  }

  if (!["real", "mock"].includes(env.aiMode)) {
    throw new Error('AI_MODE must be "real" or "mock"');
  }

  if (env.aiMode === "real" && !hasRealAIKeys()) {
    throw new Error(
      "AI_MODE=real needs VOYAGE_API_KEY and OPENAI_API_KEY (or GEMINI_API_KEY with LLM_PROVIDER=gemini)"
    );
  }
};

module.exports = env;
