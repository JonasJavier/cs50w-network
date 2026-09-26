import { Bell, Bookmark, Home, LogOut, Moon, Search, Settings, Sun, User } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { useLogout } from '../../hooks/useAuth'
import { useUnreadCount } from '../../hooks/useNotifications'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore } from '../../stores/theme'
import { Avatar } from '../ui/Avatar'
import { Menu, MenuItem } from '../ui/Menu'
import { Logo } from './Logo'

function NavIcon({
  to,
  label,
  children,
  badge,
}: {
  to: string
  label: string
  children: React.ReactNode
  badge?: number
}) {
  return (
    <NavLink
      to={to}
      aria-label={badge ? `${label} (${badge} unread)` : label}
      title={label}
      className={({ isActive }) =>
        cn(
          // On phones these live in the bottom navigation instead.
          'relative hidden rounded-full p-2.5 transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 md:block',
          isActive
            ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
        )
      }
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-white dark:ring-zinc-950">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export function Navbar() {
  const user = useAuthStore((state) => state.user)
  const resolved = useThemeStore((state) => state.resolved)
  const toggleTheme = useThemeStore((state) => state.toggle)
  const { data: unread = 0 } = useUnreadCount()
  const logout = useLogout()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)

  // "/" focuses the search box, like GitHub / Twitter.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        searchInput.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Clear the box when leaving the search page (state adjusted during render, not in an effect).
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname)
    if (!location.pathname.startsWith('/search')) setQuery('')
  }

  const onSearch = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Logo />

        <form onSubmit={onSearch} role="search" className="hidden flex-1 justify-center md:flex">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
            <label htmlFor="global-search" className="sr-only">
              Search people, posts and hashtags
            </label>
            <input
              id="global-search"
              ref={searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, posts, #hashtags…"
              autoComplete="off"
              className="input-base rounded-full pr-10 pl-10"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-zinc-300 px-1.5 text-[10px] font-medium text-zinc-400 lg:block dark:border-zinc-700">
              /
            </kbd>
          </div>
        </form>

        <nav aria-label="Primary" className="ml-auto flex items-center gap-1.5">
          <NavIcon to="/" label="Home">
            <Home className="size-5" />
          </NavIcon>
          <NavIcon to="/notifications" label="Notifications" badge={unread}>
            <Bell className="size-5" />
          </NavIcon>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title="Toggle theme"
            className="rounded-full p-2.5 text-zinc-500 transition outline-none hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            {resolved === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>

          {user && (
            <Menu
              className="ml-1"
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Account menu"
                  aria-expanded={open}
                  aria-haspopup="menu"
                  className="rounded-full ring-brand-500 transition outline-none hover:ring-2 focus-visible:ring-2"
                >
                  <Avatar user={user} size="sm" />
                </button>
              )}
            >
              {(close) => (
                <div className="w-60">
                  <Link
                    to={`/profile/${user.username}`}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Avatar user={user} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-zinc-500">@{user.username}</p>
                    </div>
                  </Link>
                  <div className="my-1.5 border-t border-zinc-100 dark:border-zinc-800" />
                  <MenuItem
                    icon={<User />}
                    onClick={() => (close(), navigate(`/profile/${user.username}`))}
                  >
                    My profile
                  </MenuItem>
                  <MenuItem icon={<Bookmark />} onClick={() => (close(), navigate('/bookmarks'))}>
                    Bookmarks
                  </MenuItem>
                  <MenuItem icon={<Settings />} onClick={() => (close(), navigate('/settings'))}>
                    Settings
                  </MenuItem>
                  <div className="my-1.5 border-t border-zinc-100 dark:border-zinc-800" />
                  <MenuItem icon={<LogOut />} danger onClick={() => (close(), logout())}>
                    Log out
                  </MenuItem>
                </div>
              )}
            </Menu>
          )}
        </nav>
      </div>
    </header>
  )
}
