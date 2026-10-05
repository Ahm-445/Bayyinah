import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useI18n } from '../../../i18n/core.js'
import { register } from '../../../services/api/auth.js'
import { isApiError, userMessage } from '../../../services/errors.js'
import { homeFor } from '../../../shared/lib/roles.js'
import Field from '../components/Field.jsx'

const USERNAME = /^[A-Za-z0-9_.-]{3,32}$/
const MIN_PASSWORD = 8

function validate({ username, password, confirm }, t) {
  const errors = {}
  if (!USERNAME.test(username)) errors.username = t('register.usernameRule')
  if (password.length < MIN_PASSWORD) errors.password = t('register.passwordRule', { min: MIN_PASSWORD })
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
    <section className="mx-auto max-w-sm rounded-lg border border-stone-200 bg-white p-6">
      <h1 className="text-xl font-semibold">{t('register.title')}</h1>
      <p className="mt-1 text-sm text-stone-600">{t('register.subtitle')}</p>
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
          hint={t('register.passwordRule', { min: MIN_PASSWORD })}
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
          <p role="alert" className="text-sm text-red-700">
            {userMessage(mutation.error, i18n)}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {mutation.isPending ? t('register.creating') : t('register.create')}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        {t('register.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-emerald-700 underline">
          {t('register.signIn')}
        </Link>
      </p>
    </section>
  )
}
