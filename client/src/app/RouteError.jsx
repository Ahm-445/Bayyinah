import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { useI18n } from '../i18n/core.js'

export default function RouteError() {
  const error = useRouteError()
  const { t } = useI18n()
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : t('routeError.unexpected')

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold text-brand">{t('routeError.title')}</h1>
      <p className="mt-2 text-ink-soft">{message}</p>
      <Link to="/" className="btn btn-primary mt-6">
        {t('routeError.back')}
      </Link>
    </div>
  )
}
