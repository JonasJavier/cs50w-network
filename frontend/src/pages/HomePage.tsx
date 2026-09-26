import { Link, useSearchParams } from 'react-router'
import { PostComposer } from '../components/posts/PostComposer'
import { PostFeed } from '../components/posts/PostFeed'
import { Tabs } from '../components/ui/Tabs'
import { usePageTitle } from '../hooks/usePageTitle'

const TABS = [
  { key: 'all', label: 'For you' },
  { key: 'following', label: 'Following' },
] as const

export function HomePage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('feed') === 'following' ? 'following' : 'all'
  usePageTitle(tab === 'following' ? 'Following' : 'Home')

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Home feed</h1>
      <PostComposer />

      <Tabs
        aria-label="Feed"
        items={TABS}
        value={tab}
        onChange={(key) => setParams(key === 'all' ? {} : { feed: 'following' }, { replace: true })}
      />

      {tab === 'following' ? (
        <PostFeed
          key="following"
          filters={{ feed: 'following' }}
          emptyTitle="Your following feed is quiet"
          emptyDescription="Follow people to see their posts here, together with your own."
          emptyAction={
            <Link
              to="/search"
              className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Find people to follow →
            </Link>
          }
        />
      ) : (
        <PostFeed key="all" />
      )}
    </div>
  )
}
