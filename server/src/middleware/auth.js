const HttpError = require("../utils/httpError");
const { verifyToken } = require("../services/token");

/** Requires `Authorization: Bearer <token>`; sets req.user = { id, role }. */
function requireAuth(req, res, next) {
  const [scheme, token] = (req.get("authorization") || "").split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new HttpError(401, "Please sign in.");
  }

  try {
    req.user = verifyToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }

  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new HttpError(403, "You do not have access to this page.");
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
