import { SendHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import { useAddComment, useComments } from '../../hooks/useComments'
import { apiErrorMessage } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import { toast } from '../../stores/toast'
import { Avatar } from '../ui/Avatar'
import { Spinner } from '../ui/Spinner'
import { CommentItem } from './CommentItem'

interface CommentSectionProps {
  postId: number
  highlightCommentId?: number | null
}

export const MAX_COMMENT_LENGTH = 1000

export function CommentSection({ postId, highlightCommentId }: CommentSectionProps) {
  const me = useAuthStore((state) => state.user)
  const comments = useComments(postId)
  const addComment = useAddComment(postId)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const submit = () => {
    const content = draft.trim()
    if (!content || addComment.isPending) return
    addComment.mutate(
      { content },
      {
        onSuccess: () => setDraft(''),
        onError: (error) => toast.error(apiErrorMessage(error, 'Could not post the comment.')),
      },
    )
  }

  const allComments = comments.data?.pages.flatMap((page) => page.results) ?? []
  const total = comments.data?.pages[0]?.count ?? 0

  return (
    <section
      aria-label="Comments"
      className="mt-3 animate-fade-in border-t border-zinc-100 pt-3 dark:border-zinc-800"
    >
      {me && (
        <div className="flex items-center gap-2.5">
          <Avatar user={me} size="sm" />
          <div className="relative flex-1">
            <label htmlFor={`comment-${postId}`} className="sr-only">
              Write a comment
            </label>
            <input
              id={`comment-${postId}`}
              ref={input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit()
                }
              }}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder="Write a comment…"
              autoComplete="off"
              className="input-base rounded-full pr-11"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim() || addComment.isPending}
              aria-label="Send comment"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full p-1.5 text-brand-600 transition hover:bg-brand-50 disabled:opacity-40 dark:text-brand-400 dark:hover:bg-brand-950"
            >
              {addComment.isPending ? (
                <Spinner className="size-4.5 text-brand-600" />
              ) : (
                <SendHorizontal className="size-4.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {comments.isPending && (
        <div className="flex justify-center py-4" role="status" aria-label="Loading comments">
          <Spinner className="size-5 text-brand-600" />
        </div>
      )}
      {comments.isError && (
        <p className="py-3 text-center text-sm text-red-600 dark:text-red-400">
          Couldn't load comments.
        </p>
      )}

      {allComments.length > 0 && (
        <div className="mt-2 space-y-1">
          {allComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              highlightCommentId={highlightCommentId}
            />
          ))}
        </div>
      )}

      {comments.hasNextPage && (
        <button
          type="button"
          onClick={() => comments.fetchNextPage()}
          disabled={comments.isFetchingNextPage}
          className="mt-2 text-sm font-semibold text-brand-600 hover:underline disabled:opacity-60 dark:text-brand-400"
        >
          {comments.isFetchingNextPage
            ? 'Loading…'
            : `Show more comments (${Math.max(0, total - allComments.length)})`}
        </button>
      )}
    </section>
  )
}
