import { ImagePlus, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from 'react'
import { useCreatePost } from '../../hooks/usePosts'
import { apiErrorMessage } from '../../lib/api'
import type { PostPreview } from '../../lib/types'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import { toast } from '../../stores/toast'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { QuotedPost } from './QuotedPost'

export const MAX_POST_LENGTH = 2000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

interface PostComposerProps {
  /** When set, the composer creates a quote of this post. */
  quoteOf?: PostPreview
  placeholder?: string
  autoFocus?: boolean
  onPosted?: () => void
  className?: string
}

export function PostComposer({
  quoteOf,
  placeholder = 'Share something with your network…',
  autoFocus = false,
  onPosted,
  className,
}: PostComposerProps) {
  const user = useAuthStore((state) => state.user)
  const createPost = useCreatePost()
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  // Auto-grow the textarea with its content.
  useEffect(() => {
    const node = textarea.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 400)}px`
  }, [content])

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const pickImage = useCallback((file: File | null) => {
    if (file && !file.type.startsWith('image/')) {
      toast.error('Only image files can be attached.')
      return
    }
    if (file && file.size > MAX_IMAGE_BYTES) {
      toast.error('Images must be smaller than 5 MB.')
      return
    }
    setImage(file)
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return file ? URL.createObjectURL(file) : null
    })
  }, [])

  if (!user) return null

  const trimmed = content.trim()
  const tooLong = content.length > MAX_POST_LENGTH
  const canPost = (trimmed.length > 0 || image !== null) && !tooLong && !createPost.isPending

  const submit = () => {
    if (!canPost) return
    setError(null)
    createPost.mutate(
      { content: trimmed, image, repost_of_id: quoteOf?.id },
      {
        onSuccess: () => {
          setContent('')
          pickImage(null)
          toast.success(quoteOf ? 'Quote posted' : 'Posted')
          onPosted?.()
        },
        onError: (err) => setError(apiErrorMessage(err)),
      },
    )
  }

  const onPaste = (event: ClipboardEvent) => {
    const file = Array.from(event.clipboardData.files).find((item) =>
      item.type.startsWith('image/'),
    )
    if (file) {
      event.preventDefault()
      pickImage(file)
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) pickImage(file)
  }

  return (
    <div
      className={cn('card p-4 transition', dragging && 'ring-2 ring-brand-500/60', className)}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex gap-3">
        <Avatar user={user} size="md" />
        <div className="min-w-0 flex-1">
          <label htmlFor={`composer-${quoteOf?.id ?? 'main'}`} className="sr-only">
            {placeholder}
          </label>
          <textarea
            id={`composer-${quoteOf?.id ?? 'main'}`}
            ref={textarea}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onPaste={onPaste}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
            }}
            placeholder={placeholder}
            rows={quoteOf ? 3 : 2}
            autoFocus={autoFocus}
            maxLength={MAX_POST_LENGTH + 200}
            className="w-full resize-none border-none bg-transparent py-1.5 text-[15px] leading-relaxed outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          {preview && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <img
                src={preview}
                alt="Attachment preview"
                className="max-h-80 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => pickImage(null)}
                aria-label="Remove image"
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          {quoteOf && <QuotedPost post={quoteOf} />}
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-brand-400 dark:hover:bg-brand-950"
            >
              <ImagePlus className="size-4.5" />
              Photo
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                pickImage(event.target.files?.[0] ?? null)
                event.target.value = ''
              }}
            />
            <div className="flex items-center gap-3">
              {content.length > MAX_POST_LENGTH - 300 && (
                <span
                  aria-live="polite"
                  className={cn(
                    'text-xs tabular-nums',
                    tooLong ? 'font-semibold text-red-500' : 'text-zinc-400',
                  )}
                >
                  {MAX_POST_LENGTH - content.length}
                </span>
              )}
              <Button onClick={submit} disabled={!canPost} loading={createPost.isPending}>
                {quoteOf ? 'Quote' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
