// Citation markers: the answer text cites a source with [[chunkId]],
// e.g. "... to worship Him [[quran-hafs-51-56]]."
// The published answer's sources are exactly the markers left in its text.
// (Marker format pending backend agreement.)

const ID = '[A-Za-z0-9._:-]+'
const MARKER = new RegExp(`\\[\\[(${ID})\\]\\]`, 'g')
// One or more markers separated only by whitespace: rendered as one "(…; …)".
const MARKER_RUN = new RegExp(`\\[\\[${ID}\\]\\](?:\\s*\\[\\[${ID}\\]\\])*`, 'g')

export const markerFor = (chunkId) => `[[${chunkId}]]`

/** Unique chunk ids cited in `text`, in order of first appearance. */
export function markerIds(text) {
  return [...new Set([...(text ?? '').matchAll(MARKER)].map((m) => m[1]))]
}

/**
 * Splits text into plain parts and marker runs:
 * [{ type: 'text', value }, { type: 'refs', ids: [...] }, ...]
 */
export function tokenize(text) {
  const tokens = []
  let last = 0
  for (const match of (text ?? '').matchAll(MARKER_RUN)) {
    if (match.index > last) tokens.push({ type: 'text', value: text.slice(last, match.index) })
    tokens.push({ type: 'refs', ids: [...match[0].matchAll(MARKER)].map((m) => m[1]) })
    last = match.index + match[0].length
  }
  if (last < (text ?? '').length) tokens.push({ type: 'text', value: text.slice(last) })
  return tokens
}

const QURAN_CHUNK = /^quran-hafs-(\d+)-(\d+)$/
const TAFSIR_CHUNK = /^tafsir-book-1-(\d+)-(\d+)$/

/**
 * Short English label for an inline reference, e.g. "Qur'an 51:56".
 * Uses surah/ayah numbers when the API sends them, otherwise the known
 * chunk id patterns, otherwise the reference string.
 */
export function inlineLabel(citation) {
  const tafsir = citation.chunkId?.match(TAFSIR_CHUNK)
  if (tafsir) return `Tafsir on ${tafsir[1]}:${tafsir[2]}`
  if (citation.sourceType === 'tafsir') return `Tafsir: ${citation.reference ?? citation.chunkId}`

  const quran = citation.chunkId?.match(QURAN_CHUNK)
  const surah = citation.surahNumber ?? quran?.[1]
  const ayah = citation.ayahNumber ?? quran?.[2]
  if (surah && ayah) return `Qur'an ${surah}:${ayah}`

  return citation.reference ?? citation.sourceTitle ?? 'Source'
}
