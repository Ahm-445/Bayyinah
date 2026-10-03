import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { login } from '../../../services/api/auth.js'
import { userMessage } from '../../../services/errors.js'
import { getAuth } from '../../../services/session.js'
import { homeFor } from '../../../shared/lib/roles.js'
import Field from '../components/Field.jsx'

/** One sign-in page for questioners, dāʿīs and admins; redirects by role. */
export default function LoginPage() {
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
    <section className="mx-auto max-w-sm rounded-lg border border-stone-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field
          id="username"
          label="Username"
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mutation.isError && (
          <p role="alert" className="text-sm text-red-700">
            {userMessage(mutation.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        New here?{' '}
        <Link to="/register" className="font-medium text-emerald-700 underline">
          Create an account
        </Link>{' '}
        to ask a question.
      </p>
      {/* Inline env check (not config.useMocks) so the build drops it when mocks are off. */}
      {import.meta.env.VITE_USE_MOCKS === 'true' && (
        <p className="mt-4 text-xs text-stone-500">
          Mock accounts (password demo1234): questioners sara, john · dāʿīs khalid, maryam · admin
        </p>
      )}
    </section>
  )
}
