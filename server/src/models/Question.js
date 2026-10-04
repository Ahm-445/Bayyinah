const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 128,
  },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  language: { type: String, enum: ["ar", "en"], default: undefined },
  aiAction: { type: String, enum: ["ANSWER", "CLARIFY", "ABSTAIN", "REFER"], default: undefined },
  latestAIResultId: { type: mongoose.Schema.Types.ObjectId, ref: "Draft", default: null },
  status: {
    type: String,
    enum: ["submitted", "processing", "awaiting_review", "answered", "referred", "reviewed", "failed"],
    default: "submitted",
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.models.Question || mongoose.model("Question", questionSchema);
