const env = require("./config/env");
const { connectDB, disconnectDB } = require("./config/db");
const { createApp } = require("./app");

async function start() {
  try {
    env.assertValid();
    await connectDB();
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }

  const app = createApp();
  const { processor, aiService } = app.locals;

  const stale = await processor.recoverStuck();
  if (stale > 0) console.warn(`Marked ${stale} unfinished question(s) as failed`);

  const server = app.listen(env.port, () => {
    console.log(`Bayyinah API listening on port ${env.port} (AI: ${aiService.mode})`);
  });

  let closing = false;

  async function shutdown(signal) {
    if (closing) return;
    closing = true;
    console.log(`${signal} received, shutting down`);

    server.close(async () => {
      await Promise.allSettled([processor.idle(), aiService.close()]);
      await disconnectDB();
      process.exit(0);
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start();
