import { cn } from '../../lib/utils'

export interface TabItem<K extends string> {
  key: K
  label: string
  count?: number
}

interface TabsProps<K extends string> {
  items: readonly TabItem<K>[]
  value: K
  onChange: (key: K) => void
  className?: string
  'aria-label'?: string
}

/** Segmented control used for feed / profile / search tabs. */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  className,
  ...rest
}: TabsProps<K>) {
  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn('flex card p-1.5', className)}
    >
      {items.map(({ key, label, count }) => {
        const active = value === key
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
              active
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
            )}
          >
            {label}
            {count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular-nums',
                  active ? 'bg-white/20' : 'bg-zinc-200 dark:bg-zinc-700',
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
