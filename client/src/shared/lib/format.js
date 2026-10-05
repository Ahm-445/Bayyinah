const formatters = new Map()

function relative(locale) {
  if (!formatters.has(locale)) formatters.set(locale, new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }))
  return formatters.get(locale)
}

const UNITS = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/**
 * "5 minutes ago" / "قبل 5 دقائق" in the UI locale (from useI18n().locale).
 * `now` defaults to the current time; pass it to keep a list consistent.
 * Under a minute, or a future time, reads as "now".
 */
export function timeAgo(iso, { now = Date.now(), locale = 'en' } = {}) {
  if (!iso) return ''
  const elapsed = now - new Date(iso).getTime()
  if (!Number.isFinite(elapsed)) return ''
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return relative(locale).format(-Math.floor(elapsed / ms), unit)
  }
  return relative(locale).format(0, 'second')
}

/** Full local date/time, for title tooltips. */
export function fullDate(iso, locale = 'en') {
  return iso ? new Date(iso).toLocaleString(locale) : ''
}
