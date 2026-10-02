/**
 * Error with an HTTP status and a machine-readable code.
 * Thrown from controllers/services, rendered by middleware/errorHandler.
 *
 * Usage: throw new HttpError(409, "Already selected", "already_selected");
 */
class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

module.exports = HttpError;
