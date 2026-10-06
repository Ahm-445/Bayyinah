import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import { MOCK_STRINGS } from '../../../i18n/mockStrings.js'
import { login } from '../../../services/api/auth.js'
import { isApiError, userMessage } from '../../../services/errors.js'
import { getAuth } from '../../../services/session.js'
import { homeFor } from '../../../shared/lib/roles.js'
import AuthShell from '../components/AuthShell.jsx'
import Field from '../components/Field.jsx'

/** One sign-in page for questioners, dāʿīs and admins; redirects by role. */
export default function LoginPage() {
  const i18n = useI18n()
  const { t } = i18n
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: login,
    // A page the user tried to open first; RequireRole sends them home if it is not for their role.
    onSuccess: (user) => navigate(location.state?.from ?? homeFor(user.role), { replace: true }),
  })

  const auth = getAuth()
  if (auth?.token && !mutation.isPending && !mutation.isSuccess) {
    return <Navigate to={homeFor(auth.user?.role)} replace />
  }

  function handleSubmit(event) {
    event.preventDefault()
    mutation.mutate({ username: username.trim(), password })
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold text-brand">{t('auth.signInTitle')}</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field
          id="username"
          label={t('auth.username')}
          required
          dir="ltr"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Field
          id="password"
          label={t('auth.password')}
          type="password"
          required
          dir="ltr"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mutation.isError && (
          <p role="alert" className="text-sm text-danger">
            {isApiError(mutation.error, 401) ? t('auth.invalidCredentials') : userMessage(mutation.error, i18n)}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn btn-primary btn-lg w-full"
        >
          {mutation.isPending ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-soft">
        {t('auth.newHere')}{' '}
        <Link to="/register" className="font-semibold text-accent underline underline-offset-2">
          {t('auth.createAccount')}
        </Link>{' '}
        {t('auth.toAsk')}
      </p>
      {/* Inline env check (not config.useMocks) so the build drops it when mocks are off. */}
      {import.meta.env.VITE_USE_MOCKS === 'true' && (
        <p className="mt-4 text-xs text-ink-soft">{MOCK_STRINGS[i18n.lang].accounts}</p>
      )}
    </AuthShell>
  )
}
