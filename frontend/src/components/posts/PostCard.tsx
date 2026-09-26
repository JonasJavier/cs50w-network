import {
  Bookmark,
  Heart,
  Link as LinkIcon,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  PenLine,
  Repeat2,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  useBookmarkPost,
  useDeletePost,
  useLikePost,
  usePostLikers,
  useRepostPost,
  useUpdatePost,
} from '../../hooks/usePosts'
import { apiErrorMessage } from '../../lib/api'
import { RichText } from '../ui/RichText'
import type { Post, UserMini } from '../../lib/types'
import { cn, copyToClipboard, formatCount, timeAgo } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import { toast } from '../../stores/toast'
import { Avatar } from '../ui/Avatar'
import { Button, IconButton } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Lightbox } from '../ui/Lightbox'
import { Menu, MenuItem } from '../ui/Menu'
import { UserListModal } from '../users/UserListModal'
import { CommentSection } from './CommentSection'
import { MAX_POST_LENGTH } from './PostComposer'
import { QuoteModal } from './QuoteModal'
import { QuotedPost } from './QuotedPost'

interface PostCardProps {
  post: Post
  defaultShowComments?: boolean
  highlightCommentId?: number | null
}

const LONG_POST = 480

export function PostCard({ post, defaultShowComments = false, highlightCommentId }: PostCardProps) {
  // A plain repost renders its original, with a "reposted" header.
  if (post.is_repost) {
    if (!post.repost_of) return null
    return (
      <PostCardInner
        post={{ ...post.repost_of, repost_of: null, is_repost: false }}
        repostedBy={post.author}
        defaultShowComments={defaultShowComments}
        highlightCommentId={highlightCommentId}
      />
    )
  }
  return (
    <PostCardInner
      post={post}
      defaultShowComments={defaultShowComments}
      highlightCommentId={highlightCommentId}
    />
  )
}

interface InnerProps extends PostCardProps {
  repostedBy?: UserMini
}

function PostCardInner({
  post,
  repostedBy,
  defaultShowComments = false,
  highlightCommentId,
}: InnerProps) {
  const me = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const likePost = useLikePost()
  const repostPost = useRepostPost()
  const bookmarkPost = useBookmarkPost()
  const deletePost = useDeletePost()
  const updatePost = useUpdatePost(post.id)

  const [showComments, setShowComments] = useState(defaultShowComments)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(post.content)
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [showLikers, setShowLikers] = useState(false)
  const likers = usePostLikers(post.id, showLikers)

  const isMine = me?.id === post.author.id
  const isLong = post.content.length > LONG_POST && !expanded
  const postUrl = `${window.location.origin}/post/${post.id}`

  const onError = (fallback: string) => (error: unknown) =>
    toast.error(apiErrorMessage(error, fallback))

  const saveEdit = () => {
    const content = draft.trim()
    if (!content || content === post.content) return setEditing(false)
    updatePost.mutate(
      { content },
      {
        onSuccess: () => {
          setEditing(false)
          toast.success('Post updated')
        },
        onError: onError('Could not update the post.'),
      },
    )
  }

  const remove = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        setConfirmDelete(false)
        toast.success('Post deleted')
        if (window.location.pathname === `/post/${post.id}`) navigate('/', { replace: true })
      },
      onError: onError('Could not delete the post.'),
    })
  }

  const copyLink = async () => {
    const ok = await copyToClipboard(postUrl)
    if (ok) toast.success('Link copied to clipboard')
    else toast.error('Could not copy the link.')
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${post.author.name} on Network`, url: postUrl })
        return
      } catch {
        /* user dismissed the sheet — fall back to copying */
      }
    }
    copyLink()
  }

  return (
    <article className="animate-fade-in card p-4" aria-labelledby={`post-${post.id}-author`}>
      {repostedBy && (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Repeat2 className="size-3.5" />
          <Link to={`/profile/${repostedBy.username}`} className="hover:underline">
            {repostedBy.id === me?.id ? 'You' : repostedBy.name}
          </Link>
          reposted
        </p>
      )}

      <div className="flex items-start gap-3">
        <Link
          to={`/profile/${post.author.username}`}
          className="shrink-0 rounded-full"
          tabIndex={-1}
          aria-hidden
        >
          <Avatar user={post.author} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <Link
              id={`post-${post.id}-author`}
              to={`/profile/${post.author.username}`}
              className="truncate text-sm font-bold hover:underline"
            >
              {post.author.name}
            </Link>
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              @{post.author.username}
            </span>
          </div>
          {post.author.headline && (
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {post.author.headline}
            </p>
          )}
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            <Link to={`/post/${post.id}`} className="hover:underline">
              <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
            </Link>
            {post.is_edited && ' · edited'}
          </p>
        </div>

        <Menu
          trigger={({ toggle, open }) => (
            <IconButton label="Post options" size="sm" onClick={toggle} aria-expanded={open}>
              <MoreHorizontal className="size-5" />
            </IconButton>
          )}
        >
          {(close) => (
            <>
              <MenuItem icon={<LinkIcon />} onClick={() => (close(), copyLink())}>
                Copy link
              </MenuItem>
              <MenuItem
                icon={<Bookmark className={cn(post.is_bookmarked && 'fill-current')} />}
                onClick={() => (
                  close(),
                  bookmarkPost.mutate(post.id, { onError: onError('Could not update bookmark.') })
                )}
              >
                {post.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}
              </MenuItem>
              {isMine && (
                <>
                  <MenuItem
                    icon={<Pencil />}
                    onClick={() => {
                      close()
                      setDraft(post.content)
                      setEditing(true)
                    }}
                  >
                    Edit
                  </MenuItem>
                  <MenuItem
                    icon={<Trash2 />}
                    danger
                    onClick={() => (close(), setConfirmDelete(true))}
                  >
                    Delete
                  </MenuItem>
                </>
              )}
            </>
          )}
        </Menu>
      </div>

      {editing ? (
        <div className="mt-3">
          <label htmlFor={`edit-${post.id}`} className="sr-only">
            Edit post
          </label>
          <textarea
            id={`edit-${post.id}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') saveEdit()
              if (event.key === 'Escape') setEditing(false)
            }}
            rows={4}
            maxLength={MAX_POST_LENGTH}
            autoFocus
            className="input-base resize-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-400 tabular-nums">
              {MAX_POST_LENGTH - draft.length}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveEdit}
                disabled={!draft.trim()}
                loading={updatePost.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        post.content && (
          <div className="mt-3">
            <p
              className={cn(
                'text-[15px] leading-relaxed break-words whitespace-pre-wrap',
                isLong && 'line-clamp-6',
              )}
            >
              <RichText text={post.content} />
            </p>
            {post.content.length > LONG_POST && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="mt-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )
      )}

      {post.image && (
        <button
          type="button"
          onClick={() => setLightbox(post.image)}
          className="mt-3 block aspect-[3/2] max-h-[28rem] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:border-zinc-800 dark:bg-zinc-800"
          aria-label="Open image"
        >
          <img
            src={post.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition hover:opacity-95"
          />
        </button>
      )}

      {post.repost_of && <QuotedPost post={post.repost_of} />}

      <div className="mt-3 flex items-center gap-0.5 border-t border-zinc-100 pt-2 dark:border-zinc-800">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => likePost.mutate(post.id, { onError: onError('Could not update like.') })}
            aria-pressed={post.is_liked}
            aria-label={post.is_liked ? 'Unlike' : 'Like'}
            className={cn(
              'group flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-red-500/40',
              post.is_liked
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400',
            )}
          >
            <Heart
              className={cn('size-4.5 transition', post.is_liked && 'animate-pop fill-current')}
            />
          </button>
          {post.likes_count > 0 && (
            <button
              type="button"
              onClick={() => setShowLikers(true)}
              className="-ml-1.5 rounded-full py-1.5 pr-2.5 pl-1 text-sm font-medium text-zinc-500 tabular-nums hover:underline dark:text-zinc-400"
              aria-label={`${post.likes_count} likes`}
            >
              {formatCount(post.likes_count)}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowComments((show) => !show)}
          aria-expanded={showComments}
          aria-label="Comments"
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium tabular-nums transition focus-visible:ring-2 focus-visible:ring-brand-500/40',
            showComments
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-zinc-500 hover:bg-brand-50 hover:text-brand-600 dark:text-zinc-400 dark:hover:bg-brand-950 dark:hover:text-brand-400',
          )}
        >
          <MessageCircle className="size-4.5" />
          {post.comments_count > 0 && formatCount(post.comments_count)}
        </button>

        <Menu
          align="left"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={post.is_reposted ? 'Reposted' : 'Repost'}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium tabular-nums transition focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                post.is_reposted
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-500 hover:bg-emerald-50 hover:text-emerald-600 dark:text-zinc-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400',
              )}
            >
              <Repeat2 className="size-4.5" />
              {post.reposts_count > 0 && formatCount(post.reposts_count)}
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                icon={<Repeat2 />}
                onClick={() => {
                  close()
                  repostPost.mutate(post.id, {
                    onSuccess: (data) =>
                      toast.success(data.is_reposted ? 'Reposted' : 'Repost removed'),
                    onError: onError('Could not repost.'),
                  })
                }}
              >
                {post.is_reposted ? 'Undo repost' : 'Repost'}
              </MenuItem>
              <MenuItem icon={<PenLine />} onClick={() => (close(), setQuoting(true))}>
                Quote
              </MenuItem>
            </>
          )}
        </Menu>

        <div className="ml-auto flex items-center">
          <IconButton
            label={post.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}
            size="sm"
            aria-pressed={post.is_bookmarked}
            onClick={() =>
              bookmarkPost.mutate(post.id, { onError: onError('Could not update bookmark.') })
            }
            className={cn(post.is_bookmarked && 'text-brand-600 dark:text-brand-400')}
          >
            <Bookmark className={cn('size-4.5', post.is_bookmarked && 'fill-current')} />
          </IconButton>
          <IconButton label="Share" size="sm" onClick={share}>
            <LinkIcon className="size-4.5" />
          </IconButton>
        </div>
      </div>

      {showComments && <CommentSection postId={post.id} highlightCommentId={highlightCommentId} />}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      <QuoteModal post={quoting ? post : null} onClose={() => setQuoting(false)} />
      {showLikers && (
        <UserListModal
          title="Liked by"
          query={likers}
          emptyText="No likes yet."
          onClose={() => setShowLikers(false)}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete post?"
        description="This can't be undone. Replies, likes and reposts of this post will be removed too."
        confirmLabel="Delete"
        destructive
        loading={deletePost.isPending}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </article>
  )
}
