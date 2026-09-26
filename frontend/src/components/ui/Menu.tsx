import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { cn } from '../../lib/utils'

interface MenuProps {
  /** Render prop for the trigger; receives the open state and a toggle handler. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
}

/** Minimal dropdown menu with outside-click / Escape dismissal. */
export function Menu({ trigger, children, align = 'right', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)

  return (
    <div ref={ref} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-20 mt-1.5 min-w-44 animate-scale-in overflow-hidden card p-1.5 shadow-lg',
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon?: ReactNode
  children: ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger = false,
  disabled = false,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition outline-none focus-visible:bg-zinc-100 disabled:opacity-50 dark:focus-visible:bg-zinc-800',
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800',
      )}
    >
      {icon && <span className="text-current [&>svg]:size-4">{icon}</span>}
      {children}
    </button>
  )
}
