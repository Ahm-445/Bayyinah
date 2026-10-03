import { useI18n } from '../../i18n/core.js'
import { VERIFICATION_TONE } from '../lib/enums.js'

const TONE = {
  success: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  warning: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  danger: 'bg-red-100 text-red-800 ring-red-600/20',
  neutral: 'bg-stone-100 text-stone-700 ring-stone-500/20',
}

/** PASS → Verified, NEEDS_REVIEW → Needs Review, FAIL → Verification failed. */
export default function VerificationBadge({ status }) {
  const { t } = useI18n()
  const tone = VERIFICATION_TONE[status] ?? 'neutral'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[tone]}`}
    >
      {VERIFICATION_TONE[status] ? t(`verification.${status}`) : t('verification.none')}
    </span>
  )
}
