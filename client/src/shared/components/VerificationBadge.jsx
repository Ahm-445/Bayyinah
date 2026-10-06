import { useI18n } from '../../i18n/core.js'
import { VERIFICATION_TONE } from '../lib/enums.js'

const TONE = {
  success: 'bg-mint text-brand',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-ceramic text-ink-soft',
}

/** PASS → Verified, NEEDS_REVIEW → Needs Review, FAIL → Verification failed. */
export default function VerificationBadge({ status }) {
  const { t } = useI18n()
  const tone = VERIFICATION_TONE[status] ?? 'neutral'
  return (
    <span
      className={`chip ${TONE[tone]}`}
    >
      {VERIFICATION_TONE[status] ? t(`verification.${status}`) : t('verification.none')}
    </span>
  )
}
