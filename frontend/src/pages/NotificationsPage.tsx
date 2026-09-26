import {
  AtSign,
  BellOff,
  CheckCheck,
  Heart,
  MessageCircle,
  PenLine,
  Repeat2,
  Reply,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageSpinner, Spinner } from '../components/ui/Spinner'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import {
  useClearNotifications,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '../hooks/useNotifications'
import { usePageTitle } from '../hooks/usePageTitle'
import { apiErrorMessage } from '../lib/api'
import type { AppNotification, NotificationVerb } from '../lib/types'
import { cn, timeAgo } from '../lib/utils'
import { toast } from '../stores/toast'

const VERB_META: Record<NotificationVerb, { icon: typeof Heart; text: string; color: string }> = {
  follow: {
    icon: UserPlus,
    text: 'started following you',
    color: 'text-brand-600 bg-brand-50 dark:bg-brand-950 dark:text-brand-300',
  },
  like_post: {
    icon: Heart,
    text: 'liked your post',
    color: 'text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400',
  },
  comment: {
    icon: MessageCircle,
    text: 'commented on your post',
    color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400',
  },
  reply: {
    icon: Reply,
    text: 'replied to your comment',
    color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-400',
  },
  like_comment: {
    icon: Heart,
    text: 'liked your comment',
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400',
  },
  mention: {
    icon: AtSign,
    text: 'mentioned you',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
  },
  repost: {
    icon: Repeat2,
    text: 'reposted your post',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
  quote: {
    icon: PenLine,
    text: 'quoted your post',
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-400',
  },
}

function targetPath(notification: AppNotification): string {
  if (notification.post) {
    const comment = notification.comment ? `?comment=${notification.comment}` : ''
    return `/post/${notification.post}${comment}`
  }
  return `/profile/${notification.actor.username}`
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const markRead = useMarkRead()
  const navigate = useNavigate()
  const meta = VERB_META[notification.verb] ?? VERB_META.mention
  const Icon = meta.icon
  const preview = notification.comment_preview || notification.post_preview

  const open = () => {
    if (!notification.is_read) markRead.mutate(notification.id)
    navigate(targetPath(notification))
  }

  return (
    <li>
      <button
        type="button"
        onClick={open}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3.5 text-left transition outline-none hover:bg-zinc-50 focus-visible:bg-zinc-50 dark:hover:bg-zinc-800/60 dark:focus-visible:bg-zinc-800/60',
          !notification.is_read && 'bg-brand-50/60 dark:bg-brand-950/30',
        )}
      >
        <div className="relative shrink-0">
          <Avatar user={notification.actor} size="md" />
          <span
            className={cn(
              'absolute -right-1 -bottom-1 flex size-5.5 items-center justify-center rounded-full ring-2 ring-white dark:ring-zinc-900',
              meta.color,
            )}
            aria-hidden
          >
            <Icon className="size-3" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">
            <Link
              to={`/profile/${notification.actor.username}`}
              onClick={(event) => event.stopPropagation()}
              className="font-bold hover:underline"
            >
              {notification.actor.name}
            </Link>{' '}
            {meta.text}
          </p>
          {preview && (
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">“{preview}”</p>
          )}
          <p className="mt-0.5 text-xs text-zinc-400">
            <time dateTime={notification.created_at}>{timeAgo(notification.created_at)}</time>
          </p>
        </div>
        {!notification.is_read && (
          <span className="mt-2 size-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />
        )}
      </button>
    </li>
  )
}

export function NotificationsPage() {
  const notifications = useNotifications()
  const markAllRead = useMarkAllRead()
  const clear = useClearNotifications()
  const [confirmClear, setConfirmClear] = useState(false)
  usePageTitle('Notifications')

  const sentinel = useInfiniteScroll({
    hasNextPage: notifications.hasNextPage,
    isFetchingNextPage: notifications.isFetchingNextPage,
    fetchNextPage: notifications.fetchNextPage,
  })

  const all = notifications.data?.pages.flatMap((page) => page.results) ?? []
  const hasUnread = all.some((notification) => !notification.is_read)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Notifications</h1>
        {all.length > 0 && (
          <div className="flex gap-1">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  markAllRead.mutate(undefined, { onError: (e) => toast.error(apiErrorMessage(e)) })
                }
                loading={markAllRead.isPending}
              >
                <CheckCheck className="size-4" />
                Mark all as read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
              <Trash2 className="size-4" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {notifications.isPending && <PageSpinner />}
      {notifications.isError && (
        <EmptyState
          icon={BellOff}
          title="Couldn't load notifications"
          description={apiErrorMessage(notifications.error)}
        />
      )}
      {notifications.isSuccess && all.length === 0 && (
        <EmptyState
          icon={BellOff}
          title="Nothing here yet"
          description="Likes, comments, mentions, reposts and new followers will show up here."
        />
      )}
      {all.length > 0 && (
        <ul className="divide-y divide-zinc-100 overflow-hidden card p-0 dark:divide-zinc-800">
          {all.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </ul>
      )}

      <div ref={sentinel} aria-hidden />
      {notifications.isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <Spinner />
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear all notifications?"
        description="This removes every notification from your list."
        confirmLabel="Clear"
        destructive
        loading={clear.isPending}
        onConfirm={() =>
          clear.mutate(undefined, {
            onSuccess: () => setConfirmClear(false),
            onError: (error) => toast.error(apiErrorMessage(error)),
          })
        }
        onClose={() => setConfirmClear(false)}
      />
    </div>
  )
}
