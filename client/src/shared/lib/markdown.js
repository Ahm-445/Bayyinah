/**
 * Plain text from AI-written Markdown, so neither the dāʿī (editor) nor the
 * questioner ever sees ** or similar syntax. Keeps the content and the line
 * structure: numbered items stay "1. …", bullets become "• …", headings and
 * quotes become plain lines, links keep their text.
 * Safe on plain text: Qur'an references like "(Al-Ikhlas 112:1)" and Arabic
 * text are left unchanged.
 */
export function stripMarkdown(text) {
  if (!text) return text ?? ''
  let s = String(text).replace(/\r\n/g, '\n')

  s = s
    // Code fences: drop the ``` lines, keep the content.
    .replace(/^\s*(```|~~~).*$/gm, '')
    // Horizontal rules.
    .replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, '')
    // Headings and block quotes.
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    // Bullets → "• "; numbered items keep their number.
    .replace(/^(\s*)[-*+]\s+(?=\S)/gm, '$1• ')
    .replace(/^(\s*)(\d+)[.)]\s+(?=\S)/gm, '$1$2. ')
    // Images and links keep their text.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Bold / italic / strikethrough / inline code.
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, '$1$2')
    .replace(/(^|[^\w_])_(?=\S)([^_\n]*?\S)_(?![\w_])/g, '$1$2')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    // Leftover unmatched ** or __ markers.
    .replace(/\*\*|__/g, '')
    // Trailing spaces and runs of blank lines.
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')

  return s.trim()
}
