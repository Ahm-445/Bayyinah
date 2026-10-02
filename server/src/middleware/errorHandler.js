const env = require("../config/env");

function notFound(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "not_found",
  });
}

// Express recognises error handlers by their 4-argument signature.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || "Internal server error";
  // Only our own HttpError carries a client-safe code.
  let code = err.name === "HttpError" ? err.code : undefined;

  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
    code = "invalid_json";
  } else if (err.name === "ValidationError") {
    status = 400;
    code = "validation_error";
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
    code = "invalid_id";
  } else if (err.code === 11000) {
    status = 409;
    message = "Duplicate record";
    code = "duplicate";
  }

  if (status >= 500) {
    console.error(err);
    if (env.isProduction) message = "Internal server error";
  }

  res.status(status).json({
    error: message,
    ...(code ? { code } : {}),
  });
}

module.exports = { notFound, errorHandler };
