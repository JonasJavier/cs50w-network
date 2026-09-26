import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface LightboxProps {
  src: string | null
  alt?: string
  onClose: () => void
}

/** Full-screen image viewer. */
export function Lightbox({ src, alt = '', onClose }: LightboxProps) {
  useEffect(() => {
    if (!src) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [src, onClose])

  if (!src) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-[70] flex animate-fade-in items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="size-6" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full animate-scale-in rounded-lg object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  )
}
