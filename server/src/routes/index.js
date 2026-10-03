const express = require("express");
const mongoose = require("mongoose");
const QuestionModel = require("../models/Question");
const DraftModel = require("../models/Draft");
const { createAIService } = require("../services/aiService");
const { createQuestionController } = require("../controllers/questionController");
const { createReviewController } = require("../controllers/reviewController");

function createApiRouter({
  aiService = createAIService(),
  Question = QuestionModel,
  Draft = DraftModel,
  databaseState,
} = {}) {
  const router = express.Router();
  const questionController = createQuestionController({ QuestionModel: Question, DraftModel: Draft, aiService });
  const reviewController = createReviewController({ DraftModel: Draft, QuestionModel: Question });

  router.get("/health", (req, res) => { // eslint-disable-line no-unused-vars
    const connected = databaseState ? databaseState() : mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({
      status: connected ? "ok" : "degraded",
      db: connected ? "connected" : "disconnected",
      uptime: Math.floor(process.uptime()),
    });
  });

  router.post("/questions/:questionId/ai-answer", questionController.answerQuestion);
  router.get("/review/drafts", reviewController.listPendingDrafts);
  router.post("/review/drafts/:draftId/decision", reviewController.decideDraft);
  router.get("/questions/:questionId/published-answer", reviewController.getPublishedAnswer);
  return router;
}

module.exports = { createApiRouter };
