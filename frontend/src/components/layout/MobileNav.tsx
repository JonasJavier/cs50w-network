import { Bell, Home, Search, User } from 'lucide-react'
import { NavLink } from 'react-router'
import { useUnreadCount } from '../../hooks/useNotifications'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'

export function MobileNav() {
  const user = useAuthStore((state) => state.user)
  const { data: unread = 0 } = useUnreadCount()

  const items = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unread },
    { to: `/profile/${user?.username ?? ''}`, label: 'Profile', icon: User },
  ]

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden dark:border-zinc-800 dark:bg-zinc-950/90"
    >
      <div className="flex h-14 items-center justify-around">
        {items.map(({ to, label, icon: Icon, badge, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={badge ? `${label} (${badge} unread)` : label}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                isActive
                  ? 'text-brand-600 dark:text-brand-300'
                  : 'text-zinc-500 dark:text-zinc-400',
              )
            }
          >
            <Icon className="size-6" />
            <span className="text-[10px] font-medium">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="absolute top-0.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
