import { Link } from 'react-router'
import type { UserCard as UserCardType } from '../../lib/types'
import { Avatar } from '../ui/Avatar'
import { FollowButton } from './FollowButton'

interface UserCardProps {
  user: UserCardType
  /** Narrow layout (sidebar): hides the "Follows you" badge. */
  compact?: boolean
}

export function UserCard({ user, compact = false }: UserCardProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Link
        to={`/profile/${user.username}`}
        className="shrink-0 rounded-full"
        tabIndex={-1}
        aria-hidden
      >
        <Avatar user={user} size="md" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            to={`/profile/${user.username}`}
            className="truncate text-sm font-semibold hover:underline"
          >
            {user.name}
          </Link>
          {user.follows_you && !compact && (
            <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Follows you
            </span>
          )}
        </div>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {user.headline || `@${user.username}`}
        </p>
      </div>
      <FollowButton username={user.username} isFollowing={user.is_following} size="sm" />
    </div>
  )
}
