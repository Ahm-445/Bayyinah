const mongoose = require("mongoose");

const { Schema } = mongoose;

const answerSchema = new Schema(
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
    draftId: { type: Schema.Types.ObjectId, ref: "Draft", required: true },
    finalText: { type: String, required: true },
    // Evidence the dāʿī actually cited inside finalText.
    citations: { type: [Schema.Types.Mixed], default: [] },
    verificationStatus: {
      type: String,
      enum: ["PASS", "NEEDS_REVIEW", "FAIL", null],
      default: null,
    },
    aiAssisted: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "app_answers" }
);

// A dāʿī can answer a question once.
answerSchema.index({ questionId: 1, daeeId: 1 }, { unique: true });

module.exports = mongoose.model("Answer", answerSchema);
