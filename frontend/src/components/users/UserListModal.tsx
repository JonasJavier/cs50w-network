import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import type { CountPage, UserCard as UserCardType } from '../../lib/types'
import { Modal } from '../ui/Modal'
import { UserListSkeleton } from '../ui/PostSkeleton'
import { Spinner } from '../ui/Spinner'
import { UserCard } from './UserCard'

interface UserListModalProps {
  title: string
  query: UseInfiniteQueryResult<InfiniteData<CountPage<UserCardType>>, Error>
  emptyText?: string
  onClose: () => void
}

/** Scrollable list of people (followers, following, likers…) in a modal. */
export function UserListModal({
  title,
  query,
  emptyText = 'Nobody here yet.',
  onClose,
}: UserListModalProps) {
  const users = query.data?.pages.flatMap((page) => page.results) ?? []
  const sentinel = useInfiniteScroll({
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    rootMargin: '200px',
  })

  return (
    <Modal open onClose={onClose} title={title}>
      {query.isPending && <UserListSkeleton />}
      {query.isError && (
        <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">
          Couldn't load this list.
        </p>
      )}
      {query.isSuccess && users.length === 0 && (
        <p className="py-6 text-center text-sm text-zinc-500">{emptyText}</p>
      )}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {users.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
      <div ref={sentinel} aria-hidden />
      {query.isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <Spinner className="size-5 text-brand-600" />
        </div>
      )}
    </Modal>
  )
}
