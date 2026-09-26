import { Hash, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { useTrendingHashtags } from '../../hooks/useHashtags'
import { useSuggestions } from '../../hooks/useUsers'
import { hashtagPath } from '../../lib/richtext'
import { pluralize } from '../../lib/utils'
import { UserListSkeleton } from '../ui/PostSkeleton'
import { UserCard } from '../users/UserCard'

export function SidebarRight() {
  const suggestions = useSuggestions()
  const trending = useTrendingHashtags()

  return (
    <aside className="sticky top-20 hidden h-fit space-y-4 xl:block" aria-label="Discover">
      <section className="card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-brand-600 dark:text-brand-400" />
          Who to follow
        </h2>
        {suggestions.isPending && <UserListSkeleton />}
        {suggestions.isError && (
          <p className="py-3 text-sm text-zinc-500">Suggestions are unavailable right now.</p>
        )}
        {suggestions.data?.length === 0 && (
          <p className="py-3 text-sm text-zinc-500">You're following everyone already. 🎉</p>
        )}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {suggestions.data?.map((user) => (
            <UserCard key={user.id} user={user} compact />
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Hash className="size-4 text-brand-600 dark:text-brand-400" />
          Trending this week
        </h2>
        {trending.isPending && (
          <div className="mt-3 animate-pulse space-y-2.5" aria-hidden>
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-3.5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        )}
        {trending.data?.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            No hashtags yet — start a trend with #yourtopic.
          </p>
        )}
        <ol className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          {trending.data?.map((tag, index) => (
            <li key={tag.name}>
              <Link
                to={hashtagPath(tag.name)}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <span className="w-4 text-xs text-zinc-400 tabular-nums">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">#{tag.name}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {pluralize(tag.posts_count, 'post')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <p className="px-2 text-xs text-zinc-400 dark:text-zinc-600">
        Network · Django REST Framework + React ·{' '}
        <a
          href="https://github.com/JonasJavier/cs50w-network"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          Source
        </a>
      </p>
    </aside>
  )
}
