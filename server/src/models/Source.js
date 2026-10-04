const mongoose = require("mongoose");

// Registry of approved sources. `sourceId` is the same string the AI module
// stores in knowledge_chunks.sourceId.
const sourceSchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    domain: {
      type: String,
      required: true,
      enum: ["quran", "translation", "tafsir", "hadith"],
      index: true,
    },
    url: { type: String, trim: true },
    author: { type: String, trim: true },
    authorityLevel: { type: String, trim: true },
    language: { type: String, trim: true },
    version: { type: String, trim: true },
    license: { type: String, trim: true },
    usageBasis: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "app_sources" }
);

module.exports = mongoose.model("Source", sourceSchema);
