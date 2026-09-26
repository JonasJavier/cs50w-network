import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'
import { Spinner } from './Spinner'

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500/50 disabled:bg-brand-400 dark:disabled:bg-brand-800',
  secondary:
    'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 focus-visible:ring-zinc-400/50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
  ghost:
    'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-zinc-400/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/50 disabled:bg-red-400',
  'danger-outline':
    'border border-red-300 text-red-600 hover:bg-red-50 focus-visible:ring-red-500/50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40',
} as const

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition outline-none focus-visible:ring-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  size?: 'sm' | 'md'
}

/** Round icon-only button with an accessible label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active = false, size = 'md', className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'size-8' : 'size-10',
        active
          ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})
