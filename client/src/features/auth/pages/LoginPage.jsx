import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { login } from '../../../services/api/auth.js'
import { config } from '../../../services/config.js'
import { userMessage } from '../../../services/errors.js'
import { ROLE } from '../../../shared/lib/enums.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      const fallback = user.role === ROLE.ADMIN || user.role === ROLE.DAEE ? '/daee' : '/ask'
      navigate(location.state?.from ?? fallback, { replace: true })
    },
  })

  function handleSubmit(event) {
    event.preventDefault()
    mutation.mutate({ email, password })
  }

  return (
    <section className="mx-auto max-w-sm rounded-lg border border-stone-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Dāʿī sign in</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="text-stone-700">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-700">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </label>
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
      {config.useMocks && (
        <p className="mt-4 text-xs text-stone-500">
          Mock accounts: daee@bayyinah.test, daee2@bayyinah.test, admin@bayyinah.test, password
          demo1234
        </p>
      )}
    </section>
  )
}
