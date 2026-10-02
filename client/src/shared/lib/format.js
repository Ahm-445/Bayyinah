const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const UNITS = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/** "5 minutes ago", "2 hours ago"; "just now" under a minute or for future times. */
export function timeAgo(iso, now = Date.now()) {
  if (!iso) return ''
  const elapsed = now - new Date(iso).getTime()
  if (!Number.isFinite(elapsed)) return ''
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return relative.format(-Math.floor(elapsed / ms), unit)
  }
  return 'just now'
}

/** Full local date/time, for title tooltips. */
export function fullDate(iso) {
  return iso ? new Date(iso).toLocaleString() : ''
}
