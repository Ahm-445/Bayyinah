const env = require("./config/env");
const { connectDB, disconnectDB } = require("./config/db");
const { closeAI } = require("./modules/ai");
const { createApp } = require("./app");

async function start() {
  await connectDB();
  const server = createApp().listen(env.port, () => {
    console.log(`Bayyinah API listening on port ${env.port}`);
  });

  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    server.close(async () => {
      await Promise.allSettled([closeAI(), disconnectDB()]);
      process.exit(0);
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return server;
}

if (require.main === module) {
  start().catch(() => {
    console.error("Failed to start Bayyinah API");
    process.exitCode = 1;
  });
}

module.exports = { start };
