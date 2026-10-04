const mongoose = require("mongoose");

const { Schema } = mongoose;

const draftSchema = new Schema({
  questionId: { type: String, required: true, index: true },
  questionText: { type: String, required: true, maxlength: 2000 },
  action: { type: String, required: true, enum: ["ANSWER", "CLARIFY", "ABSTAIN", "REFER"] },
  aiAction: { type: String, required: true, enum: ["ANSWER", "CLARIFY", "ABSTAIN", "REFER"] },
  classification: { type: Schema.Types.Mixed, required: true },
  safety: { type: Schema.Types.Mixed, required: true },
  evidence: { type: [Schema.Types.Mixed], default: [] },
  draft: { type: Schema.Types.Mixed, default: null },
  verification: { type: Schema.Types.Mixed, default: null },
  status: {
    type: String,
    enum: ["pending_review", "published", "rejected", "reviewed"],
    default: "pending_review",
    index: true,
  },
  reviewedAt: { type: Date, default: null },
  publishedAt: { type: Date, default: null },
  warningsAcknowledged: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: true } });

module.exports = mongoose.models.Draft || mongoose.model("Draft", draftSchema);
