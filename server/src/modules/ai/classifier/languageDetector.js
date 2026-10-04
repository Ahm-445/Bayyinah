const SUPPORTED_LANGUAGES = Object.freeze({ ARABIC: "ar", ENGLISH: "en" });

/** Deterministically detects Arabic script; defaults to English for supported Latin text. */
function detectLanguage(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Question text is required for language detection");
  }
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u.test(text)
    ? SUPPORTED_LANGUAGES.ARABIC
    : SUPPORTED_LANGUAGES.ENGLISH;
}

module.exports = { detectLanguage, SUPPORTED_LANGUAGES };
