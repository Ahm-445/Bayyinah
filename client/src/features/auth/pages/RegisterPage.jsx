import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { register } from '../../../services/api/auth.js'
import { isApiError, userMessage } from '../../../services/errors.js'
import { homeFor } from '../../../shared/lib/roles.js'
import Field from '../components/Field.jsx'

const USERNAME = /^[A-Za-z0-9_.-]{3,32}$/
const MIN_PASSWORD = 8

function validate({ username, password, confirm }) {
  const errors = {}
  if (!USERNAME.test(username)) {
    errors.username = '3–32 characters: letters, numbers, dot, dash or underscore.'
  }
  if (password.length < MIN_PASSWORD) errors.password = `At least ${MIN_PASSWORD} characters.`
  if (confirm !== password) errors.confirm = 'Passwords do not match.'
  return errors
}

/** Questioner sign-up. Dāʿī accounts are created by the team, not here. */
export default function RegisterPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ username: '', password: '', confirm: '' })
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validate({ ...values, username: values.username.trim() }) : {}

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
    if (Object.keys(validate({ ...values, username })).length) return
    mutation.mutate({ username, password: values.password })
  }

  return (
    <section className="mx-auto max-w-sm rounded-lg border border-stone-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Create an account</h1>
      <p className="mt-1 text-sm text-stone-600">
        Your questions and answers are private to your account.
      </p>
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <Field
          id="username"
          label="Username"
          autoComplete="username"
          value={values.username}
          onChange={set('username')}
          hint="Do not use your real name if you prefer to stay anonymous."
          error={errors.username ?? (usernameTaken ? 'That username is already taken.' : undefined)}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          hint={`At least ${MIN_PASSWORD} characters.`}
          error={errors.password}
        />
        <Field
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        {mutation.isError && !usernameTaken && (
          <p role="alert" className="text-sm text-red-700">
            {userMessage(mutation.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {mutation.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-emerald-700 underline">
          Sign in
        </Link>
      </p>
    </section>
  )
}
