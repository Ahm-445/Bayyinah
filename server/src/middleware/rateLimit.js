const HttpError = require("../utils/httpError");

/**
 * Fixed-window limiter kept in memory (one server process is enough for the demo).
 * Over the limit it answers `429 { error, code: "rate_limited" }` with `Retry-After`.
 *
 * @param {Object} options
 * @param {number} options.windowMs
 * @param {number} options.max requests allowed per key in one window
 * @param {(req) => string} options.key who is being limited (IP, user id…)
 * @param {string} [options.message]
 */
function createRateLimiter({
  windowMs,
  max,
  key,
  message = "Too many requests. Please try again later.",
}) {
  const hits = new Map();

  // Forget expired windows so the map cannot grow forever.
  const cleaner = setInterval(() => {
    const now = Date.now();

    for (const [name, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(name);
    }
  }, Math.min(windowMs, 60_000));
  cleaner.unref();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const name = String(key(req));
    let entry = hits.get(name);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(name, entry);
    }

    entry.count += 1;

    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      throw new HttpError(429, message, "rate_limited");
    }

    next();
  };
}

module.exports = { createRateLimiter };
