import { Heart, MoreHorizontal, Pencil, SendHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  useAddComment,
  useDeleteComment,
  useLikeComment,
  useUpdateComment,
} from '../../hooks/useComments'
import { apiErrorMessage } from '../../lib/api'
import { RichText } from '../ui/RichText'
import type { Comment } from '../../lib/types'
import { cn, formatCount, timeAgo } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import { toast } from '../../stores/toast'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Menu, MenuItem } from '../ui/Menu'
import { MAX_COMMENT_LENGTH } from './CommentSection'

interface CommentItemProps {
  comment: Comment
  postId: number
  isReply?: boolean
  highlightCommentId?: number | null
}

export function CommentItem({
  comment,
  postId,
  isReply = false,
  highlightCommentId,
}: CommentItemProps) {
  const me = useAuthStore((state) => state.user)
  const likeComment = useLikeComment(postId)
  const deleteComment = useDeleteComment(postId)
  const updateComment = useUpdateComment(postId)
  const addComment = useAddComment(postId)
  const [replying, setReplying] = useState(false)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(comment.content)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const node = useRef<HTMLDivElement>(null)
  const highlighted = highlightCommentId === comment.id

  useEffect(() => {
    if (highlighted) node.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlighted])

  const isMine = me?.id === comment.author.id

  const sendReply = () => {
    const content = draft.trim()
    if (!content || addComment.isPending) return
    addComment.mutate(
      { content, parent: comment.id },
      {
        onSuccess: () => {
          setDraft('')
          setReplying(false)
        },
        onError: (error) => toast.error(apiErrorMessage(error, 'Could not post the reply.')),
      },
    )
  }

  const saveEdit = () => {
    const content = editDraft.trim()
    if (!content || content === comment.content) return setEditing(false)
    updateComment.mutate(
      { id: comment.id, content },
      {
        onSuccess: () => setEditing(false),
        onError: (error) => toast.error(apiErrorMessage(error, 'Could not update the comment.')),
      },
    )
  }

  return (
    <div
      ref={node}
      id={`comment-${comment.id}`}
      className={cn('flex gap-2.5 py-2', isReply && 'ml-10')}
    >
      <Link
        to={`/profile/${comment.author.username}`}
        className="mt-0.5 shrink-0 rounded-full"
        tabIndex={-1}
        aria-hidden
      >
        <Avatar user={comment.author} size={isReply ? 'xs' : 'sm'} />
      </Link>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'group/comment relative rounded-2xl bg-zinc-100 px-3.5 py-2.5 transition dark:bg-zinc-800',
            highlighted && 'highlight-target',
          )}
        >
          <div className="flex items-baseline gap-2 pr-6">
            <Link
              to={`/profile/${comment.author.username}`}
              className="truncate text-[13px] font-bold hover:underline"
            >
              {comment.author.name}
            </Link>
            <span className="shrink-0 text-[11px] text-zinc-400">
              <time dateTime={comment.created_at}>{timeAgo(comment.created_at)}</time>
              {comment.is_edited && ' · edited'}
            </span>
          </div>
          {editing ? (
            <div className="mt-1.5">
              <label htmlFor={`edit-comment-${comment.id}`} className="sr-only">
                Edit comment
              </label>
              <textarea
                id={`edit-comment-${comment.id}`}
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    saveEdit()
                  }
                  if (event.key === 'Escape') setEditing(false)
                }}
                rows={2}
                maxLength={MAX_COMMENT_LENGTH}
                autoFocus
                className="input-base py-2 text-sm"
              />
              <div className="mt-1.5 flex justify-end gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveEdit}
                  loading={updateComment.isPending}
                  disabled={!editDraft.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              <RichText text={comment.content} />
            </p>
          )}
          {isMine && !editing && (
            <div className="absolute top-1.5 right-1.5">
              <Menu
                trigger={({ toggle, open }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-label="Comment options"
                    className="rounded-full p-1 text-zinc-400 opacity-60 transition group-hover/comment:opacity-100 hover:bg-zinc-200 hover:text-zinc-700 focus-visible:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem
                      icon={<Pencil />}
                      onClick={() => {
                        close()
                        setEditDraft(comment.content)
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
              </Menu>
            </div>
          )}
        </div>

        <div className="mt-1 flex items-center gap-3 px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <button
            type="button"
            onClick={() =>
              likeComment.mutate(comment.id, {
                onError: (error) => toast.error(apiErrorMessage(error, 'Could not update like.')),
              })
            }
            aria-pressed={comment.is_liked}
            aria-label={comment.is_liked ? 'Unlike comment' : 'Like comment'}
            className={cn(
              'flex items-center gap-1 rounded transition hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500/40 dark:hover:text-red-400',
              comment.is_liked && 'text-red-600 dark:text-red-400',
            )}
          >
            <Heart className={cn('size-3.5', comment.is_liked && 'fill-current')} />
            {comment.likes_count > 0 && (
              <span className="tabular-nums">{formatCount(comment.likes_count)}</span>
            )}
          </button>
          {!isReply && (
            <button
              type="button"
              onClick={() => setReplying((value) => !value)}
              aria-expanded={replying}
              className="rounded transition hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:text-brand-400"
            >
              Reply
            </button>
          )}
        </div>

        {replying && (
          <div className="relative mt-2">
            <label htmlFor={`reply-${comment.id}`} className="sr-only">
              Reply to {comment.author.name}
            </label>
            <input
              id={`reply-${comment.id}`}
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  sendReply()
                }
                if (event.key === 'Escape') setReplying(false)
              }}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder={`Reply to ${comment.author.name}…`}
              autoComplete="off"
              className="input-base rounded-full py-2 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={sendReply}
              disabled={!draft.trim() || addComment.isPending}
              aria-label="Send reply"
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full p-1.5 text-brand-600 transition hover:bg-brand-50 disabled:opacity-40 dark:text-brand-400 dark:hover:bg-brand-950"
            >
              <SendHorizontal className="size-4" />
            </button>
          </div>
        )}

        {comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            postId={postId}
            isReply
            highlightCommentId={highlightCommentId}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete comment?"
        description={
          isReply ? 'This reply will be removed.' : 'The comment and its replies will be removed.'
        }
        confirmLabel="Delete"
        destructive
        loading={deleteComment.isPending}
        onConfirm={() =>
          deleteComment.mutate(comment.id, {
            onSuccess: () => setConfirmDelete(false),
            onError: (error) =>
              toast.error(apiErrorMessage(error, 'Could not delete the comment.')),
          })
        }
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
