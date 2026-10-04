const mongoose = require("mongoose");

const { Schema } = mongoose;

const versionSchema = new Schema(
  {
    text: { type: String, required: true },
    editedAt: { type: Date, default: Date.now },
    editedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

// One draft per dāʿī per question. It holds a frozen snapshot of the AI
// result, so a published answer stays traceable even if chunks are re-ingested.
const draftSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    daeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The AI never blocks the dāʿī, so `blocked` is not produced any more.
    status: {
      type: String,
      enum: ["in_review", "approved", "rejected", "blocked"],
      default: "in_review",
      index: true,
    },
    question: {
      text: { type: String, required: true },
      language: { type: String, default: "en" },
    },
    classification: {
      category: String,
      level: String,
      risk: String,
    },
    aiAction: {
      type: String,
      enum: ["ANSWER", "CLARIFY", "ABSTAIN", "REFER"],
      required: true,
    },
    safety: { type: Schema.Types.Mixed, default: null },
    generatedText: { type: String, default: null },
    text: { type: String, default: "" },
    versions: { type: [versionSchema], default: [] },
    evidence: { type: [Schema.Types.Mixed], default: [] },
    citations: { type: [Schema.Types.Mixed], default: [] },
    verification: { type: Schema.Types.Mixed, default: null },
    requiresAcknowledgement: { type: Boolean, default: false },
    pipeline: { type: [Schema.Types.Mixed], default: [] },
    rejectReason: { type: String },
    answerId: { type: Schema.Types.ObjectId, ref: "Answer" },
    closedAt: { type: Date },
  },
  { timestamps: true, collection: "app_drafts" }
);

draftSchema.index({ questionId: 1, daeeId: 1 }, { unique: true });

module.exports = mongoose.model("Draft", draftSchema);
