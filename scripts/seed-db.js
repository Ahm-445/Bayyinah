/**
 * Seeds the dāʿī/admin accounts and the source registry. Safe to run again:
 * existing accounts keep their password (unless --reset-passwords) and the
 * `active` flag of a source is never overwritten.
 *
 *   npm run seed --prefix server
 *   npm run seed --prefix server -- --reset-passwords
 *
 * Password: SEED_PASSWORD from server/.env (required in production,
 * "demo1234" otherwise). Demo data only: never use real people's accounts.
 */
const fs = require("fs");
const path = require("path");

const env = require("../server/src/config/env");
const { connectDB, disconnectDB } = require("../server/src/config/db");
const User = require("../server/src/models/User");
const Source = require("../server/src/models/Source");
const { hashPassword } = require("../server/src/services/password");

const ACCOUNTS = [
  { username: "khalid", displayName: "Ustadh Khalid", role: "daee" },
  { username: "maryam", displayName: "Ustadha Maryam", role: "daee" },
  { username: "admin", displayName: "Admin", role: "admin" },
];

const REGISTRY_PATH = path.resolve(__dirname, "../data/source-registry.json");

async function seedUsers(password, resetPasswords) {
  const passwordHash = await hashPassword(password);

  for (const account of ACCOUNTS) {
    const usernameLower = account.username.toLowerCase();
    const existing = await User.findOne({ usernameLower });

    if (!existing) {
      await User.create({ ...account, usernameLower, passwordHash });
      console.log(`created  ${account.role.padEnd(5)} ${account.username}`);
    } else if (resetPasswords) {
      existing.passwordHash = passwordHash;
      existing.role = account.role;
      existing.displayName = account.displayName;
      await existing.save();
      console.log(`reset    ${account.role.padEnd(5)} ${account.username}`);
    } else {
      console.log(`kept     ${account.role.padEnd(5)} ${account.username}`);
    }
  }
}

async function seedSources() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));

  for (const { active, ...source } of registry) {
    await Source.updateOne(
      { sourceId: source.sourceId },
      { $set: source, $setOnInsert: { active: active !== false } },
      { upsert: true }
    );
    console.log(`source   ${source.sourceId}`);
  }
}

async function main() {
  const resetPasswords = process.argv.includes("--reset-passwords");
  const password = env.seedPassword || (env.isProduction ? null : "demo1234");

  if (!password) {
    throw new Error("SEED_PASSWORD is required when NODE_ENV=production");
  }

  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is required (set it in server/.env)");
  }

  await connectDB();
  console.log(`Seeding database "${env.mongodbDbName}"`);

  await seedUsers(password, resetPasswords);
  await seedSources();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
