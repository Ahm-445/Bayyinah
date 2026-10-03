function notFound(req, res) {
  res.status(404).json({ error: "Route not found", code: "not_found" });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let status = err.status || 500;
  let message = err.message || "Internal server error";
  let code = err.name === "HttpError" ? err.code : undefined;

  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
    code = "invalid_json";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large";
    code = "request_too_large";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = "Invalid request data";
    code = "validation_error";
  } else if (err.code === 11000) {
    status = 409;
    message = "Duplicate record";
    code = "duplicate";
  }

  if (status >= 500) {
    console.error("Backend request failed", {
      errorName: err.name,
      errorCode: err.code,
    });
    message = "AI service is temporarily unavailable";
    code = "service_unavailable";
    status = 503;
  }

  res.status(status).json({ error: message, ...(code ? { code } : {}) });
}

module.exports = { notFound, errorHandler };
