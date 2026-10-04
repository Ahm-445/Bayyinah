const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    // Usernames are case-insensitive; this is the unique key.
    usernameLower: { type: String, required: true, unique: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["questioner", "daee", "admin"],
      default: "questioner",
      index: true,
    },
  },
  { timestamps: true, collection: "app_users" }
);

module.exports = mongoose.model("User", userSchema);
