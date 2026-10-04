const mongoose = require("mongoose");

const { Schema } = mongoose;

const selectionSchema = new Schema(
  {
    // Unique: a question has one owner and one chosen answer.
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      unique: true,
    },
    answerId: {
      type: Schema.Types.ObjectId,
      ref: "Answer",
      required: true,
      index: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    selectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "app_selections" }
);

module.exports = mongoose.model("Selection", selectionSchema);
