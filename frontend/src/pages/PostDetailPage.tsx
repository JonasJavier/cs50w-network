import { ArrowLeft, FileQuestion } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { PostCard } from '../components/posts/PostCard'
import { EmptyState } from '../components/ui/EmptyState'
import { FeedSkeleton } from '../components/ui/PostSkeleton'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePost } from '../hooks/usePosts'

export function PostDetailPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const post = usePost(Number(id))
  const highlight = Number(params.get('comment')) || null
  usePageTitle(
    post.data ? `${post.data.author.name}: “${post.data.content.slice(0, 40) || 'Post'}”` : 'Post',
  )

  const back = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={back}
        className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-zinc-500 transition hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      {post.isPending && <FeedSkeleton count={1} />}
      {(post.isError || (post.isSuccess && !post.data)) && (
        <EmptyState
          icon={FileQuestion}
          title="Post not found"
          description="It may have been deleted by its author."
          action={
            <Link
              to="/"
              className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Back to the feed
            </Link>
          }
        />
      )}
      {post.data && (
        <PostCard post={post.data} defaultShowComments highlightCommentId={highlight} />
      )}
    </div>
  )
}
