import { Link } from 'react-router'
import { useI18n } from '../i18n/core.js'

export default function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-semibold text-brand">{t('notFound.title')}</h1>
      <Link to="/" className="btn btn-primary mt-6">
        {t('notFound.goStart')}
      </Link>
    </div>
  )
}
