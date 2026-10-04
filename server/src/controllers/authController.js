const User = require("../models/User");
const HttpError = require("../utils/httpError");
const { hashPassword, verifyPassword } = require("../services/password");
const { signToken } = require("../services/token");
const { userView } = require("../services/serializers");
const { recordAudit } = require("../services/audit");

const USERNAME = /^[A-Za-z0-9_.-]{3,32}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

// Used to spend the same time on unknown usernames as on wrong passwords.
let dummyHash;
const getDummyHash = () => (dummyHash ||= hashPassword("not-a-real-password"));

function session(user) {
  return { token: signToken(user), user: userView(user) };
}

/** Questioner accounts only; dāʿī and admin accounts are seeded. */
async function register(req, res) {
  const username = String(req.body?.username ?? "").trim();
  const password = req.body?.password;

  if (!USERNAME.test(username)) {
    throw new HttpError(
      400,
      "Username must be 3–32 characters: letters, numbers, dot, dash or underscore."
    );
  }

  if (
    typeof password !== "string" ||
    password.length < MIN_PASSWORD ||
    password.length > MAX_PASSWORD
  ) {
    throw new HttpError(
      400,
      `Password must be ${MIN_PASSWORD}–${MAX_PASSWORD} characters.`
    );
  }

  const taken = () =>
    new HttpError(409, "That username is already taken.", "username_taken");

  if (await User.exists({ usernameLower: username.toLowerCase() })) {
    throw taken();
  }

  let user;

  try {
    user = await User.create({
      username,
      usernameLower: username.toLowerCase(),
      displayName: username,
      passwordHash: await hashPassword(password),
      role: "questioner",
    });
  } catch (error) {
    if (error.code === 11000) throw taken();
    throw error;
  }

  await recordAudit({
    actorId: user._id,
    action: "auth.register",
    entityType: "user",
    entityId: user._id,
  });

  res.status(201).json(session(user));
}

async function login(req, res) {
  const username = String(req.body?.username ?? "").trim().toLowerCase();
  const password = req.body?.password;

  const user = username
    ? await User.findOne({ usernameLower: username }).select("+passwordHash")
    : null;

  const valid =
    typeof password === "string" &&
    (await verifyPassword(password, user?.passwordHash ?? (await getDummyHash())));

  if (!user || !valid) {
    throw new HttpError(401, "Invalid username or password.");
  }

  await recordAudit({
    actorId: user._id,
    action: "auth.login",
    entityType: "user",
    entityId: user._id,
  });

  res.json(session(user));
}

async function me(req, res) {
  const user = await User.findById(req.user.id);

  if (!user) throw new HttpError(401, "Please sign in.");

  res.json(userView(user));
}

module.exports = { register, login, me };
