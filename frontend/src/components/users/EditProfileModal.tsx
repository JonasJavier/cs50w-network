import { Camera, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useUpdateProfile } from '../../hooks/useUsers'
import { apiErrorMessage, apiFieldErrors } from '../../lib/api'
import type { UserDetail } from '../../lib/types'
import { toast } from '../../stores/toast'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Field, Input, Textarea } from '../ui/Field'
import { Modal } from '../ui/Modal'

interface EditProfileModalProps {
  user: UserDetail
  open: boolean
  onClose: () => void
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function useImagePick(initial: string | null) {
  const [file, setFile] = useState<File | null>(null)
  const [removed, setRemoved] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  const pick = (next: File | null) => {
    if (next && !next.type.startsWith('image/')) return toast.error('Only image files are allowed.')
    if (next && next.size > MAX_IMAGE_BYTES) return toast.error('Images must be smaller than 5 MB.')
    setFile(next)
    setRemoved(false)
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return next ? URL.createObjectURL(next) : null
    })
  }
  const remove = () => {
    pick(null)
    setRemoved(true)
  }
  const current = removed ? null : (preview ?? initial)
  return { file, removed, current, pick, remove }
}

export function EditProfileModal({ user, open, onClose }: EditProfileModalProps) {
  const updateProfile = useUpdateProfile()
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    headline: user.headline,
    bio: user.bio,
    location: user.location,
    website: user.website,
  })
  const avatar = useImagePick(user.avatar)
  const cover = useImagePick(user.cover)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const avatarInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)

  const field =
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((value) => ({ ...value, [key]: event.target.value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    updateProfile.mutate(
      {
        ...form,
        avatar: avatar.file,
        cover: cover.file,
        remove_avatar: avatar.removed,
        remove_cover: cover.removed,
      },
      {
        onSuccess: () => {
          toast.success('Profile updated')
          onClose()
        },
        onError: (err) => {
          const fieldErrors = apiFieldErrors(err)
          setErrors(fieldErrors)
          if (Object.keys(fieldErrors).length === 0) toast.error(apiErrorMessage(err))
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit profile" className="max-w-xl">
      <form onSubmit={submit}>
        <div className="relative mb-12">
          <div className="h-36 overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-purple-500">
            {cover.current && <img src={cover.current} alt="" className="size-full object-cover" />}
          </div>
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              aria-label="Change cover photo"
              className="rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
            >
              <Camera className="size-4" />
            </button>
            {cover.current && (
              <button
                type="button"
                onClick={cover.remove}
                aria-label="Remove cover photo"
                className="rounded-full bg-black/60 p-2 text-white transition hover:bg-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              cover.pick(event.target.files?.[0] ?? null)
              event.target.value = ''
            }}
          />
          <div className="absolute -bottom-10 left-4">
            <div className="relative">
              {avatar.current ? (
                <img
                  src={avatar.current}
                  alt="Avatar preview"
                  className="size-20 rounded-full object-cover ring-4 ring-white dark:ring-zinc-900"
                />
              ) : (
                <Avatar
                  user={{ ...user, avatar: null }}
                  size="lg"
                  className="size-20 ring-4 ring-white dark:ring-zinc-900"
                />
              )}
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
                aria-label="Change avatar"
                className="absolute -right-1 -bottom-1 rounded-full bg-brand-600 p-1.5 text-white shadow transition hover:bg-brand-700"
              >
                <Camera className="size-3.5" />
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  avatar.pick(event.target.files?.[0] ?? null)
                  event.target.value = ''
                }}
              />
            </div>
          </div>
          {avatar.current && (
            <button
              type="button"
              onClick={avatar.remove}
              className="absolute -bottom-9 left-28 text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400"
            >
              Remove avatar
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={errors.first_name}>
              {(props) => (
                <Input
                  {...props}
                  value={form.first_name}
                  onChange={field('first_name')}
                  maxLength={150}
                  autoComplete="given-name"
                />
              )}
            </Field>
            <Field label="Last name" error={errors.last_name}>
              {(props) => (
                <Input
                  {...props}
                  value={form.last_name}
                  onChange={field('last_name')}
                  maxLength={150}
                  autoComplete="family-name"
                />
              )}
            </Field>
          </div>
          <Field label="Headline" hint={`${form.headline.length}/120`} error={errors.headline}>
            {(props) => (
              <Input
                {...props}
                value={form.headline}
                onChange={field('headline')}
                placeholder="e.g. Frontend Engineer @ Acme"
                maxLength={120}
              />
            )}
          </Field>
          <Field label="Bio" hint={`${form.bio.length}/500`} error={errors.bio}>
            {(props) => (
              <Textarea
                {...props}
                value={form.bio}
                onChange={field('bio')}
                placeholder="About you…"
                rows={3}
                maxLength={500}
              />
            )}
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Location" error={errors.location}>
              {(props) => (
                <Input
                  {...props}
                  value={form.location}
                  onChange={field('location')}
                  placeholder="City, Country"
                  maxLength={100}
                />
              )}
            </Field>
            <Field label="Website" error={errors.website}>
              {(props) => (
                <Input
                  {...props}
                  value={form.website}
                  onChange={field('website')}
                  placeholder="example.com"
                  inputMode="url"
                  maxLength={200}
                />
              )}
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={updateProfile.isPending}>
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
