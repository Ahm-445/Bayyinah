const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const { createApiRouter } = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

function createApp(options = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", createApiRouter(options));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
