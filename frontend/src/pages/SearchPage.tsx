import { Hash, SearchX, Search as SearchIcon, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PostFeed } from '../components/posts/PostFeed'
import { EmptyState } from '../components/ui/EmptyState'
import { UserListSkeleton } from '../components/ui/PostSkeleton'
import { Spinner } from '../components/ui/Spinner'
import { Tabs } from '../components/ui/Tabs'
import { UserCard } from '../components/users/UserCard'
import { useDebounce } from '../hooks/useDebounce'
import { useTrendingHashtags } from '../hooks/useHashtags'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSearchUsers } from '../hooks/useUsers'
import { hashtagPath } from '../lib/richtext'
import { pluralize } from '../lib/utils'

type Tab = 'people' | 'posts'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const isHashtag = query.startsWith('#') && query.length > 1
  const [input, setInput] = useState(query)
  const debounced = useDebounce(input.trim(), 350)
  const [tab, setTab] = useState<Tab>(
    isHashtag ? 'posts' : ((params.get('tab') as Tab) ?? 'people'),
  )
  const users = useSearchUsers(isHashtag ? '' : query)
  const trending = useTrendingHashtags()
  usePageTitle(query ? `Search: ${query}` : 'Search')

  // Keep the URL in sync with what the user types (debounced) …
  useEffect(() => {
    if (debounced !== query) {
      setParams(debounced ? { q: debounced } : {}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // … and the input in sync with the URL (navbar search, back button, hashtag links).
  const [prevQuery, setPrevQuery] = useState(query)
  if (prevQuery !== query) {
    setPrevQuery(query)
    if (input.trim() !== query) setInput(query)
    if (query.startsWith('#')) setTab('posts')
  }

  const sentinel = useInfiniteScroll({
    hasNextPage: users.hasNextPage,
    isFetchingNextPage: users.isFetchingNextPage,
    fetchNextPage: users.fetchNextPage,
  })

  const found = users.data?.pages.flatMap((page) => page.results) ?? []
  const total = users.data?.pages[0]?.count

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Search</h1>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          if (input.trim()) setParams({ q: input.trim() })
        }}
        className="relative"
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-zinc-400" />
        <label htmlFor="search-page-input" className="sr-only">
          Search people, posts or #hashtags
        </label>
        <input
          id="search-page-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search people, posts or #hashtags…"
          autoFocus
          autoComplete="off"
          className="input-base rounded-full py-3 pr-11 pl-12 text-base"
        />
        {input && (
          <button
            type="button"
            onClick={() => {
              setInput('')
              setParams({}, { replace: true })
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {!query && (
        <>
          <EmptyState
            icon={SearchIcon}
            title="Search the network"
            description="Find people by name, username or headline — or search posts by content and #hashtag."
          />
          {trending.data && trending.data.length > 0 && (
            <section className="card p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Hash className="size-4 text-brand-600 dark:text-brand-400" />
                Trending this week
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {trending.data.map((tag) => (
                  <Link
                    key={tag.name}
                    to={hashtagPath(tag.name)}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium transition hover:border-brand-500 hover:text-brand-600 dark:border-zinc-700 dark:hover:text-brand-400"
                  >
                    #{tag.name}
                    <span className="ml-1.5 text-xs text-zinc-400">
                      {pluralize(tag.posts_count, 'post')}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {query && isHashtag && (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Hash className="size-4" />
          Posts tagged{' '}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{query}</span>
        </div>
      )}

      {query && !isHashtag && (
        <Tabs
          aria-label="Search results"
          items={[
            { key: 'people', label: 'People', count: total },
            { key: 'posts', label: 'Posts' },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}

      {query && !isHashtag && tab === 'people' && (
        <>
          {users.isPending && (
            <div className="card px-4">
              <UserListSkeleton count={4} />
            </div>
          )}
          {users.isSuccess && found.length === 0 && (
            <EmptyState
              icon={SearchX}
              title={`No people matching “${query}”`}
              description="Try a different name or username."
            />
          )}
          {found.length > 0 && (
            <div className="divide-y divide-zinc-100 card px-4 dark:divide-zinc-800">
              {found.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
          <div ref={sentinel} aria-hidden />
          {users.isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Spinner />
            </div>
          )}
        </>
      )}

      {query && (isHashtag || tab === 'posts') && (
        <PostFeed
          key={query}
          filters={isHashtag ? { hashtag: query.slice(1) } : { search: query }}
          emptyTitle={`No posts matching “${query}”`}
          emptyDescription="Try different keywords."
        />
      )}
    </div>
  )
}
