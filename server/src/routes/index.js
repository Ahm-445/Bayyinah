const express = require("express");
const mongoose = require("mongoose");

const { requireAuth, requireRole } = require("../middleware/auth");
const auth = require("../controllers/authController");
const answers = require("../controllers/answerController");
const drafts = require("../controllers/draftController");
const sources = require("../controllers/sourceController");
const {
  createQuestionController,
} = require("../controllers/questionController");

const QUESTIONER = requireRole("questioner");
const DAEE = requireRole("daee", "admin");
const ADMIN = requireRole("admin");

/**
 * All routes of the REST API (docs/api.md, part 2), mounted under /api.
 * Express 5 forwards errors thrown by async handlers to the error middleware.
 */
function createRoutes({ processor, aiService }) {
  const router = express.Router();
  const questions = createQuestionController({ processor });

  router.get("/health", (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;

    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? "ok" : "degraded",
      db: dbConnected ? "connected" : "disconnected",
      ai: aiService.mode,
      uptime: Math.round(process.uptime()),
    });
  });

  // Accounts
  router.post("/auth/register", auth.register);
  router.post("/auth/login", auth.login);
  router.get("/auth/me", requireAuth, auth.me);

  // Questioner (own questions only)
  router.get("/questions", requireAuth, QUESTIONER, questions.list);
  router.post("/questions", requireAuth, QUESTIONER, questions.create);
  router.get("/questions/:id", requireAuth, QUESTIONER, questions.get);
  router.get("/questions/:id/answers", requireAuth, QUESTIONER, questions.answers);
  router.post("/answers/:id/select", requireAuth, QUESTIONER, answers.select);

  // Dāʿī
  router.get("/daee/dashboard", requireAuth, DAEE, drafts.dashboard);
  router.get("/drafts/:id", requireAuth, DAEE, drafts.get);
  router.patch("/drafts/:id", requireAuth, DAEE, drafts.update);
  router.post("/drafts/:id/approve", requireAuth, DAEE, drafts.approve);
  router.post("/drafts/:id/reject", requireAuth, DAEE, drafts.reject);

  // Source registry
  router.get("/sources", requireAuth, ADMIN, sources.list);
  router.get("/sources/:sourceId", requireAuth, sources.getOne);
  router.patch("/sources/:sourceId", requireAuth, ADMIN, sources.setActive);

  return router;
}

module.exports = { createRoutes };
