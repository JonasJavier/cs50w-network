import { Check, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Button } from '../components/ui/Button'
import { Field, Input, PasswordInput } from '../components/ui/Field'
import { useRegister } from '../hooks/useAuth'
import { apiErrorMessage, apiFieldErrors } from '../lib/api'
import { cn } from '../lib/utils'
import { useAuthStore } from '../stores/auth'
import { AuthCardHeader, AuthLayout } from './AuthLayout'

const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/

function passwordChecks(password: string, username: string) {
  return [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Not only numbers', ok: password.length > 0 && !/^\d+$/.test(password) },
    {
      label: 'Different from your username',
      ok: password.length > 0 && (!username || password.toLowerCase() !== username.toLowerCase()),
    },
  ]
}

export function RegisterPage() {
  const access = useAuthStore((state) => state.access)
  const register = useRegister()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  if (access) return <Navigate to="/" replace />

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((value) => ({ ...value, [key]: event.target.value }))
    setErrors((value) => ({ ...value, [key]: '' }))
  }

  const checks = passwordChecks(form.password, form.username)
  const usernameValid = USERNAME_RE.test(form.username)
  const passwordsMatch = form.confirm.length > 0 && form.password === form.confirm
  const canSubmit =
    usernameValid && form.email.includes('@') && checks.every((check) => check.ok) && passwordsMatch

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setErrors({})
    if (!usernameValid) {
      return setErrors({ username: '3–30 characters: letters, numbers, dots and underscores.' })
    }
    if (form.password !== form.confirm) {
      return setErrors({ confirm: 'Passwords do not match.' })
    }
    register.mutate(
      {
        username: form.username.trim(),
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        password: form.password,
      },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (err) => {
          const fieldErrors = apiFieldErrors(err)
          setErrors(fieldErrors)
          if (Object.keys(fieldErrors).length === 0) setError(apiErrorMessage(err))
        },
      },
    )
  }

  return (
    <AuthLayout>
      <div className="card p-8">
        <AuthCardHeader
          title="Create your account"
          subtitle="Join the network in less than a minute."
        />

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={errors.first_name}>
              {(props) => (
                <Input
                  {...props}
                  value={form.first_name}
                  onChange={set('first_name')}
                  autoComplete="given-name"
                  maxLength={150}
                />
              )}
            </Field>
            <Field label="Last name" error={errors.last_name}>
              {(props) => (
                <Input
                  {...props}
                  value={form.last_name}
                  onChange={set('last_name')}
                  autoComplete="family-name"
                  maxLength={150}
                />
              )}
            </Field>
          </div>
          <Field
            label="Username"
            error={errors.username}
            hint={
              form.username && !usernameValid
                ? '3–30 characters: letters, numbers, dots and underscores.'
                : undefined
            }
          >
            {(props) => (
              <Input
                {...props}
                value={form.username}
                onChange={set('username')}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={30}
                required
              />
            )}
          </Field>
          <Field label="Email" error={errors.email}>
            {(props) => (
              <Input
                {...props}
                type="email"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                inputMode="email"
                required
              />
            )}
          </Field>
          <Field label="Password" error={errors.password}>
            {(props) => (
              <PasswordInput
                {...props}
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
                required
              />
            )}
          </Field>
          {form.password && (
            <ul className="grid gap-1 text-xs" aria-live="polite">
              {checks.map((check) => (
                <li
                  key={check.label}
                  className={cn(
                    'flex items-center gap-1.5',
                    check.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500',
                  )}
                >
                  {check.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  {check.label}
                </li>
              ))}
            </ul>
          )}
          <Field
            label="Confirm password"
            error={
              errors.confirm ??
              (form.confirm && !passwordsMatch ? 'Passwords do not match.' : undefined)
            }
          >
            {(props) => (
              <PasswordInput
                {...props}
                value={form.confirm}
                onChange={set('confirm')}
                autoComplete="new-password"
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
            loading={register.isPending}
            disabled={!canSubmit}
            className="w-full"
          >
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already a member?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
