import { VERIFICATION_BADGE } from '../lib/enums.js'

const TONE = {
  success: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  warning: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  danger: 'bg-red-100 text-red-800 ring-red-600/20',
  neutral: 'bg-stone-100 text-stone-700 ring-stone-500/20',
}

/** PASS → Verified, NEEDS_REVIEW → Needs Review, FAIL → Insufficient Evidence. */
export default function VerificationBadge({ status }) {
  const badge = VERIFICATION_BADGE[status] ?? { label: 'Not verified', tone: 'neutral' }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[badge.tone]}`}
    >
      {badge.label}
    </span>
  )
}
