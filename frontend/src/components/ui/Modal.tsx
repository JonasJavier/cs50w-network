import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  className?: string
  /** Hide the header (title stays as the accessible name). */
  hideHeader?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

let openModals = 0

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  hideHeader = false,
}: ModalProps) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    openModals += 1
    document.body.style.overflow = 'hidden'

    // Focus the first focusable element (or the panel) once mounted.
    const frame = requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel.current)?.focus()
    })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      openModals = Math.max(0, openModals - 1)
      if (openModals === 0) document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'max-h-[90dvh] w-full max-w-lg animate-slide-up overflow-y-auto card rounded-b-none p-5 outline-none sm:animate-scale-in sm:rounded-2xl',
          className,
        )}
      >
        <div className={cn('mb-4 flex items-start justify-between gap-4', hideHeader && 'sr-only')}>
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1.5 -mr-1.5 rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
