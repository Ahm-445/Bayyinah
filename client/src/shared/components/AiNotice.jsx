import { useI18n } from '../../i18n/core.js'

export default function AiNotice({ children }) {
  const { t } = useI18n()
  return (
    <p className="rounded-card bg-mint/50 px-4 py-3 text-sm text-house">
      {children ?? t('review.aiNotice')}
    </p>
  )
}
