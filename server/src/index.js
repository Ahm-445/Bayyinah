const env = require("./config/env");
const { connectDB, disconnectDB } = require("./config/db");
const app = require("./app");

async function start() {
  try {
    await connectDB();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`Bayyinah API listening on port ${env.port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received, shutting down`);

    server.close(async () => {
      try {
        await disconnectDB();
        // Loaded lazily: only closes the AI connection if it was opened.
        await require("./modules/ai").closeAI();
      } finally {
        process.exit(0);
      }
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
