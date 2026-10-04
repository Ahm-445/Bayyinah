const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const { createRoutes } = require("./routes");
const { createAIService } = require("./services/aiService");
const { createQuestionProcessor } = require("./services/questionProcessor");
const {
  notFound,
  errorHandler,
} = require("./middleware/errorHandler");

/**
 * Builds the Express app. Dependencies can be injected (tests pass a fake
 * AI service), and importing this file never opens a port or a database.
 */
function createApp({
  aiService = createAIService(),
  processor = createQuestionProcessor({ aiService }),
} = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: env.clientOrigins.length === 1 ? env.clientOrigins[0] : env.clientOrigins,
    })
  );
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", createRoutes({ processor, aiService }));

  app.use(notFound);
  app.use(errorHandler);

  app.locals.processor = processor;
  app.locals.aiService = aiService;

  return app;
}

module.exports = { createApp };
