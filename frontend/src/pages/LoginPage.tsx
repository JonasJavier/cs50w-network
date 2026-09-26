import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '../components/ui/Button'
import { Field, Input, PasswordInput } from '../components/ui/Field'
import { useLogin } from '../hooks/useAuth'
import { apiErrorMessage } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { AuthCardHeader, AuthLayout } from './AuthLayout'

const DEMO_ACCOUNTS = ['ada', 'grace', 'linus', 'tim']

export function LoginPage() {
  const access = useAuthStore((state) => state.access)
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (access) return <Navigate to="/" replace />

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    login.mutate(
      { username: username.trim(), password },
      {
        onSuccess: () => navigate(redirectTo, { replace: true }),
        onError: (err) => setError(apiErrorMessage(err, 'Invalid username or password.')),
      },
    )
  }

  return (
    <AuthLayout>
      <div className="card p-8">
        <AuthCardHeader title="Welcome back" subtitle="Log in to catch up with your network." />

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Field label="Username or email">
            {(props) => (
              <Input
                {...props}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            )}
          </Field>
          <Field label="Password">
            {(props) => (
              <PasswordInput
                {...props}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            )}
          </Field>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            loading={login.isPending}
            disabled={!username || !password}
            className="w-full"
          >
            Log in
          </Button>
        </form>

        {import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== '0' && (
          <div className="mt-5 rounded-xl border border-dashed border-zinc-300 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            <p className="font-medium text-zinc-600 dark:text-zinc-300">Try a demo account</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setUsername(name)
                    setPassword('network123')
                  }}
                  className="rounded-full border border-zinc-300 px-2.5 py-1 font-medium transition hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700 dark:hover:text-brand-400"
                >
                  @{name}
                </button>
              ))}
            </div>
            <p className="mt-1.5">
              Password for every demo account: <code>network123</code>
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          New to Network?{' '}
          <Link
            to="/register"
            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
