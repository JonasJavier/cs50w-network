import { FileQuestion, RefreshCw } from 'lucide-react'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { usePostsFeed, type FeedFilters } from '../../hooks/usePosts'
import { apiErrorMessage } from '../../lib/api'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { FeedSkeleton } from '../ui/PostSkeleton'
import { Spinner } from '../ui/Spinner'
import { PostCard } from './PostCard'

interface PostFeedProps {
  filters?: FeedFilters
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
}

export function PostFeed({
  filters = {},
  emptyTitle = 'No posts yet',
  emptyDescription = 'Be the first to share something.',
  emptyAction,
}: PostFeedProps) {
  const feed = usePostsFeed(filters)
  const sentinel = useInfiniteScroll({
    hasNextPage: feed.hasNextPage,
    isFetchingNextPage: feed.isFetchingNextPage,
    fetchNextPage: feed.fetchNextPage,
  })

  if (feed.isPending) return <FeedSkeleton />

  if (feed.isError) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Couldn't load the feed"
        description={apiErrorMessage(feed.error, 'Check that the API is running and try again.')}
        action={
          <Button variant="secondary" onClick={() => feed.refetch()} loading={feed.isFetching}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        }
      />
    )
  }

  const posts = feed.data.pages.flatMap((page) => page.results)

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={FileQuestion}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={sentinel} aria-hidden />
      {feed.isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}
      {!feed.hasNextPage && posts.length > 5 && (
        <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
          You're all caught up
        </p>
      )}
    </div>
  )
}
