import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      aria-hidden
      className={cn('animate-spin', className ?? 'size-6 text-brand-600 dark:text-brand-400')}
    />
  )
}

export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex justify-center py-16">
      <Spinner />
    </div>
  )
}
