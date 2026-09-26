import { Bookmark } from 'lucide-react'
import { Link } from 'react-router'
import { PostFeed } from '../components/posts/PostFeed'
import { usePageTitle } from '../hooks/usePageTitle'

export function BookmarksPage() {
  usePageTitle('Bookmarks')
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold">Bookmarks</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Posts you saved. Only you can see this list.
        </p>
      </div>
      <PostFeed
        filters={{ bookmarked: true }}
        emptyTitle="No bookmarks yet"
        emptyDescription="Tap the bookmark icon on any post to save it for later."
        emptyAction={
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            <Bookmark className="size-4" />
            Browse the feed
          </Link>
        }
      />
    </div>
  )
}
