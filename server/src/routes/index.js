const express = require("express");
const mongoose = require("mongoose");
const QuestionModel = require("../models/Question");
const { createAIService } = require("../services/aiService");
const { createQuestionController } = require("../controllers/questionController");

function createApiRouter({ aiService = createAIService(), Question = QuestionModel, databaseState } = {}) {
  const router = express.Router();
  const controller = createQuestionController({ QuestionModel: Question, aiService });

  router.get("/health", (req, res) => { // eslint-disable-line no-unused-vars
    const connected = databaseState ? databaseState() : mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({
      status: connected ? "ok" : "degraded",
      db: connected ? "connected" : "disconnected",
      uptime: Math.floor(process.uptime()),
    });
  });

  router.post("/questions/:questionId/ai-answer", controller.answerQuestion);
  return router;
}

module.exports = { createApiRouter };
