const Answer = require("../models/Answer");
const Selection = require("../models/Selection");

// Dāʿī scoring (team decision 2026-10-04). Deterministic and never stored:
// it is recomputed from published answers and selections on every read,
// so it always matches the data. The score is never produced by an LLM.
const SCORING = Object.freeze({
  PUBLISHED_ANSWER: 1, // each answer the dāʿī publishes
  SELECTED_ANSWER: 10, // each time a questioner selects the dāʿī's answer
});

async function computeScore(daeeId) {
  const answerIds = await Answer.find({ daeeId }).distinct("_id");
  const published = answerIds.length;
  const selected = published
    ? await Selection.countDocuments({ answerId: { $in: answerIds } })
    : 0;

  return {
    total:
      published * SCORING.PUBLISHED_ANSWER +
      selected * SCORING.SELECTED_ANSWER,
    breakdown: {
      published,
      selected,
      publishedPoints: published * SCORING.PUBLISHED_ANSWER,
      selectedPoints: selected * SCORING.SELECTED_ANSWER,
    },
  };
}

module.exports = { SCORING, computeScore };
