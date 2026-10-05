import { useI18n } from '../../i18n/core.js'

export default function AiNotice({ children }) {
  const { t } = useI18n()
  return (
    <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
      {children ?? t('review.aiNotice')}
    </p>
  )
}
