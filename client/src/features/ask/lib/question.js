export const MAX_LENGTH = 2000 // docs/api.md: text 1–2000 chars

const ARABIC = /[\u0600-\u06FF]/

/** `language` sent to the API: Arabic if the text contains Arabic letters. */
export const detectLanguage = (text) => (ARABIC.test(text) ? 'ar' : 'en')
