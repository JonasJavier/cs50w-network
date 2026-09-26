import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '../../lib/utils'
import { useToastStore, type Toast } from '../../stores/toast'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

const STYLES = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-brand-600 dark:text-brand-400',
} as const

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss)
  const Icon = ICONS[toast.kind]

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, dismiss])

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex animate-slide-up items-start gap-3 card px-4 py-3 shadow-lg"
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', STYLES[toast.kind])} />
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="-mr-1 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="w-full max-w-sm">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
