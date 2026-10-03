import { Link } from 'react-router'
import { useI18n } from '../i18n/core.js'

export default function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">{t('notFound.title')}</h1>
      <Link to="/" className="mt-6 inline-block text-emerald-700 underline">
        {t('notFound.goStart')}
      </Link>
    </div>
  )
}
