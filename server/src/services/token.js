const jwt = require("jsonwebtoken");
const env = require("../config/env");

const ALGORITHM = "HS256";

function signToken(user) {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    algorithm: ALGORITHM,
    subject: String(user._id),
    expiresIn: env.jwtExpiresIn,
  });
}

/** @returns {{ id: string, role: string }} Throws if invalid or expired. */
function verifyToken(token) {
  const payload = jwt.verify(token, env.jwtSecret, {
    algorithms: [ALGORITHM],
  });

  return { id: payload.sub, role: payload.role };
}

module.exports = { signToken, verifyToken };
