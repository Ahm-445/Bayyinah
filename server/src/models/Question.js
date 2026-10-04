const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    language: { type: String, enum: ["ar", "en"], default: "en" },
    status: {
      type: String,
      enum: [
        "submitted",
        "drafting",
        "awaiting_review",
        "answered",
        "referred",
        "failed",
      ],
      default: "submitted",
      index: true,
    },
    classification: { type: mongoose.Schema.Types.Mixed, default: null },
    aiAction: {
      type: String,
      enum: ["ANSWER", "CLARIFY", "ABSTAIN", "REFER"],
    },
  },
  // `app_` prefix: the AI owner's demo data already uses the plain
  // `questions` / `drafts` collections in the same database.
  { timestamps: true, collection: "app_questions" }
);

module.exports = mongoose.model("Question", questionSchema);
