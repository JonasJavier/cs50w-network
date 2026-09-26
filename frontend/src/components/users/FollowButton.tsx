import { UserCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useFollow } from '../../hooks/useUsers'
import { apiErrorMessage } from '../../lib/api'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/auth'
import { toast } from '../../stores/toast'
import { Button } from '../ui/Button'

interface FollowButtonProps {
  username: string
  isFollowing: boolean
  size?: 'sm' | 'md'
}

export function FollowButton({ username, isFollowing, size = 'md' }: FollowButtonProps) {
  const me = useAuthStore((state) => state.user)
  const follow = useFollow()
  const [hovering, setHovering] = useState(false)

  if (me?.username === username) return null

  const mutate = (next: boolean) =>
    follow.mutate(
      { username, follow: next },
      { onError: (error) => toast.error(apiErrorMessage(error, 'Could not update follow state.')) },
    )

  if (isFollowing) {
    return (
      <Button
        variant="secondary"
        size={size}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        onClick={() => mutate(false)}
        aria-label={`Unfollow @${username}`}
        className={cn(
          size === 'md' && 'min-w-24',
          'hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-400',
        )}
      >
        <UserCheck className="size-4" />
        {hovering ? 'Unfollow' : 'Following'}
      </Button>
    )
  }

  return (
    <Button
      size={size}
      onClick={() => mutate(true)}
      aria-label={`Follow @${username}`}
      className="min-w-24"
    >
      <UserPlus className="size-4" />
      Follow
    </Button>
  )
}
