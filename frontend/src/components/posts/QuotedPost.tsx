import { Link, useNavigate } from 'react-router'
import type { PostPreview } from '../../lib/types'
import { RichText } from '../ui/RichText'
import { timeAgo } from '../../lib/utils'
import { Avatar } from '../ui/Avatar'

/** Compact card of the original post shown inside a quote. */
export function QuotedPost({ post }: { post: PostPreview }) {
  const navigate = useNavigate()
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/post/${post.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') navigate(`/post/${post.id}`)
      }}
      className="mt-3 cursor-pointer rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
    >
      <div className="flex items-center gap-2 text-xs">
        <Avatar user={post.author} size="xs" />
        <Link
          to={`/profile/${post.author.username}`}
          onClick={(event) => event.stopPropagation()}
          className="truncate font-bold hover:underline"
        >
          {post.author.name}
        </Link>
        <span className="truncate text-zinc-500 dark:text-zinc-400">@{post.author.username}</span>
        <span className="text-zinc-400">·</span>
        <span className="shrink-0 text-zinc-400">{timeAgo(post.created_at)}</span>
      </div>
      {post.content && (
        <p className="mt-2 line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap">
          <RichText text={post.content} />
        </p>
      )}
      {post.image && (
        <img
          src={post.image}
          alt=""
          loading="lazy"
          className="mt-2 aspect-[2/1] w-full rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800"
        />
      )}
    </div>
  )
}
