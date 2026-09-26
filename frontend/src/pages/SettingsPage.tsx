import { KeyRound, Monitor, Moon, Pencil, ShieldAlert, Sun, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Field, PasswordInput } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { EditProfileModal } from '../components/users/EditProfileModal'
import { useChangePassword, useDeleteAccount } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import { apiErrorMessage, apiFieldErrors } from '../lib/api'
import { cn, formatDateTime } from '../lib/utils'
import { useAuthStore } from '../stores/auth'
import { useThemeStore, type ThemePreference } from '../stores/theme'
import { toast } from '../stores/toast'

const THEMES: Array<{ key: ThemePreference; label: string; icon: typeof Sun }> = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

function Section({
  title,
  icon: Icon,
  children,
  description,
}: {
  title: string
  icon: typeof Sun
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="card p-5" aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="flex items-center gap-2 text-base font-bold">
        <Icon className="size-4.5 text-brand-600 dark:text-brand-400" />
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function PasswordForm() {
  const changePassword = useChangePassword()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    if (form.next !== form.confirm) return setErrors({ confirm: 'Passwords do not match.' })
    changePassword.mutate(
      { current_password: form.current, new_password: form.next },
      {
        onSuccess: () => {
          setForm({ current: '', next: '', confirm: '' })
          toast.success('Password changed. Other devices were signed out.')
        },
        onError: (error) => {
          const fieldErrors = apiFieldErrors(error)
          setErrors(fieldErrors)
          if (Object.keys(fieldErrors).length === 0) toast.error(apiErrorMessage(error))
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:max-w-md" noValidate>
      <Field label="Current password" error={errors.current_password}>
        {(props) => (
          <PasswordInput
            {...props}
            value={form.current}
            onChange={(e) => setForm({ ...form, current: e.target.value })}
            autoComplete="current-password"
            required
          />
        )}
      </Field>
      <Field
        label="New password"
        error={errors.new_password}
        hint="At least 8 characters, not only numbers."
      >
        {(props) => (
          <PasswordInput
            {...props}
            value={form.next}
            onChange={(e) => setForm({ ...form, next: e.target.value })}
            autoComplete="new-password"
            required
          />
        )}
      </Field>
      <Field label="Confirm new password" error={errors.confirm}>
        {(props) => (
          <PasswordInput
            {...props}
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            autoComplete="new-password"
            required
          />
        )}
      </Field>
      <div>
        <Button
          type="submit"
          loading={changePassword.isPending}
          disabled={!form.current || form.next.length < 8 || !form.confirm}
        >
          Update password
        </Button>
      </div>
    </form>
  )
}

function DeleteAccount() {
  const deleteAccount = useDeleteAccount()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <Button variant="danger-outline" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        className="max-w-md"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          This permanently removes your profile, posts, comments, likes and followers. There is no
          way back. Enter your password to confirm.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            deleteAccount.mutate(password, {
              onSuccess: () => toast.info('Your account has been deleted.'),
              onError: (err) => setError(apiErrorMessage(err, 'Could not delete the account.')),
            })
          }}
        >
          <Field label="Password" error={error}>
            {(props) => (
              <PasswordInput
                {...props}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={deleteAccount.isPending}
              disabled={!password}
            >
              Delete permanently
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)
  const [editing, setEditing] = useState(false)
  usePageTitle('Settings')

  if (!user) return null

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Settings</h1>

      <Section title="Profile" icon={UserRound}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{user.name}</p>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              @{user.username} · {user.email}
            </p>
            {user.last_login && (
              <p className="text-xs text-zinc-400">Last login {formatDateTime(user.last_login)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Edit profile
            </Button>
            <Link
              to={`/profile/${user.username}`}
              className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              View profile
            </Link>
          </div>
        </div>
      </Section>

      <Section title="Appearance" icon={Sun} description="Choose how Network looks on this device.">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2 sm:max-w-md">
          {THEMES.map(({ key, label, icon: Icon }) => {
            const active = preference === key
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPreference(key)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            )
          })}
        </div>
      </Section>

      <Section
        title="Password"
        icon={KeyRound}
        description="Changing your password signs out every other device."
      >
        <PasswordForm />
      </Section>

      <Section
        title="Danger zone"
        icon={ShieldAlert}
        description="Deleting your account is permanent and cannot be undone."
      >
        <DeleteAccount />
      </Section>

      {editing && <EditProfileModal user={user} open={editing} onClose={() => setEditing(false)} />}
    </div>
  )
}
