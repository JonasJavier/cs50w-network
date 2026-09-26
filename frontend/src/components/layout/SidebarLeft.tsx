import { Bookmark, Home, Settings, User, Users } from 'lucide-react'
import { Link, NavLink, useSearchParams } from 'react-router'
import { cn, formatCount } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import { Avatar } from '../ui/Avatar'

const itemClass = (active: boolean) =>
  cn(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
    active
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
  )

export function SidebarLeft() {
  const user = useAuthStore((state) => state.user)
  const [params] = useSearchParams()
  const followingFeed = params.get('feed') === 'following'
  if (!user) return null

  const stats = [
    { label: 'Posts', value: user.posts_count, to: `/profile/${user.username}` },
    {
      label: 'Followers',
      value: user.followers_count,
      to: `/profile/${user.username}?tab=followers`,
    },
    {
      label: 'Following',
      value: user.following_count,
      to: `/profile/${user.username}?tab=following`,
    },
  ]

  return (
    <aside className="sticky top-20 hidden h-fit lg:block" aria-label="Sidebar">
      <div className="overflow-hidden card">
        <div className="h-16 bg-gradient-to-r from-brand-600 via-brand-500 to-purple-500">
          {user.cover && <img src={user.cover} alt="" className="size-full object-cover" />}
        </div>
        <div className="-mt-8 px-4 pb-4 text-center">
          <Link to={`/profile/${user.username}`} className="inline-block rounded-full">
            <Avatar user={user} size="lg" className="ring-4 ring-white dark:ring-zinc-900" />
          </Link>
          <Link
            to={`/profile/${user.username}`}
            className="mt-2 block text-base font-bold hover:underline"
          >
            {user.name}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
            {user.headline || `@${user.username}`}
          </p>

          <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-200 border-t border-zinc-200 pt-3 text-center dark:divide-zinc-800 dark:border-zinc-800">
            {stats.map((stat) => (
              <Link
                key={stat.label}
                to={stat.to}
                className="rounded-lg py-0.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <p className="text-sm font-bold tabular-nums">{formatCount(stat.value)}</p>
                <p className="text-[11px] text-zinc-500">{stat.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <nav aria-label="Sections" className="mt-4 space-y-0.5 card p-2">
        <NavLink to="/" end className={({ isActive }) => itemClass(isActive && !followingFeed)}>
          <Home className="size-4" />
          Home
        </NavLink>
        <NavLink to="/?feed=following" className={() => itemClass(followingFeed)}>
          <Users className="size-4" />
          Following
        </NavLink>
        <NavLink to="/bookmarks" className={({ isActive }) => itemClass(isActive)}>
          <Bookmark className="size-4" />
          Bookmarks
        </NavLink>
        <NavLink to={`/profile/${user.username}`} className={({ isActive }) => itemClass(isActive)}>
          <User className="size-4" />
          Profile
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => itemClass(isActive)}>
          <Settings className="size-4" />
          Settings
        </NavLink>
      </nav>
    </aside>
  )
}
