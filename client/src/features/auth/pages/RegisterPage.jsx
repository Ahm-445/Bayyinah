import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import { register } from '../../../services/api/auth.js'
import { isApiError, userMessage } from '../../../services/errors.js'
import { homeFor } from '../../../shared/lib/roles.js'
import AuthShell from '../components/AuthShell.jsx'
import Field from '../components/Field.jsx'

const USERNAME = /^[A-Za-z0-9_.-]{3,32}$/
// docs/api.md: password 8–128 characters
const MIN_PASSWORD = 8
const MAX_PASSWORD = 128

function validate({ username, password, confirm }, t) {
  const errors = {}
  if (!USERNAME.test(username)) errors.username = t('register.usernameRule')
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    errors.password = t('register.passwordRule', { min: MIN_PASSWORD, max: MAX_PASSWORD })
  }
  if (confirm !== password) errors.confirm = t('register.mismatch')
  return errors
}

/** Questioner sign-up. Dāʿī accounts are created by the team, not here. */
export default function RegisterPage() {
  const i18n = useI18n()
  const { t } = i18n
  const navigate = useNavigate()
  const [values, setValues] = useState({ username: '', password: '', confirm: '' })
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validate({ ...values, username: values.username.trim() }, t) : {}

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (user) => navigate(homeFor(user.role), { replace: true }),
  })
  const usernameTaken = isApiError(mutation.error, 409, 'username_taken')

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
    const username = values.username.trim()
    if (Object.keys(validate({ ...values, username }, t)).length) return
    mutation.mutate({ username, password: values.password })
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold text-brand">{t('register.title')}</h1>
      <p className="mt-1 text-sm text-ink-soft">{t('register.subtitle')}</p>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <Field
          id="username"
          label={t('auth.username')}
          dir="ltr"
          autoComplete="username"
          value={values.username}
          onChange={set('username')}
          hint={t('register.usernameHint')}
          error={errors.username ?? (usernameTaken ? t('errors.codes.username_taken') : undefined)}
        />
        <Field
          id="password"
          label={t('auth.password')}
          type="password"
          dir="ltr"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          hint={t('register.passwordRule', { min: MIN_PASSWORD, max: MAX_PASSWORD })}
          error={errors.password}
        />
        <Field
          id="confirm"
          label={t('register.confirm')}
          type="password"
          dir="ltr"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        {mutation.isError && !usernameTaken && (
          <p role="alert" className="text-sm text-danger">
            {userMessage(mutation.error, i18n)}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn btn-primary btn-lg w-full"
        >
          {mutation.isPending ? t('register.creating') : t('register.create')}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-soft">
        {t('register.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-accent underline underline-offset-2">
          {t('register.signIn')}
        </Link>
      </p>
    </AuthShell>
  )
}
