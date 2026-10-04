const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Strict 24-hex check (Mongoose's isValidObjectId also accepts any 12-char string). */
function isObjectId(value) {
  return typeof value === "string" && OBJECT_ID.test(value);
}

module.exports = { isObjectId };
