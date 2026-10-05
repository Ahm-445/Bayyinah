const ARABIC_LETTER = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g
const LATIN_LETTER = /[A-Za-z]/g

/**
 * Props for rendering a block of source text.
 * Arabic (at least 90% of letters are Arabic) → RTL with lang="ar", which
 * also applies the Arabic font. Anything else (English, mixed) → dir="auto".
 */
export function textDirProps(text) {
  const arabic = text?.match(ARABIC_LETTER)?.length ?? 0
  const latin = text?.match(LATIN_LETTER)?.length ?? 0
  if (arabic > 0 && arabic / (arabic + latin) >= 0.9) return { lang: 'ar', dir: 'rtl' }
  return { dir: 'auto' }
}
