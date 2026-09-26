import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { CursorPage, Post, UserCard } from '../lib/types'

/** Map every item of every page in an infinite query result. */
export function mapPages<T>(
  data: InfiniteData<CursorPage<T>> | undefined,
  update: (item: T) => T,
): InfiniteData<CursorPage<T>> | undefined {
  return (
    data && {
      ...data,
      pages: data.pages.map((page) => ({ ...page, results: page.results.map(update) })),
    }
  )
}

/** Apply an update to a post wherever it is cached: feeds, detail, and embedded originals. */
export function updatePostEverywhere(
  queryClient: QueryClient,
  id: number,
  update: (post: Post) => Post,
) {
  const patch = (post: Post): Post => {
    let next = post.id === id ? update(post) : post
    if (next.repost_of && next.repost_of.id === id) {
      // The embedded original shares the same counters/flags → apply the same update.
      const {
        repost_of: _ignored,
        is_repost: _flag,
        ...updated
      } = update({
        ...next.repost_of,
        repost_of: null,
        is_repost: false,
      })
      next = { ...next, repost_of: updated }
    }
    return next
  }
  queryClient.setQueriesData<InfiniteData<CursorPage<Post>>>({ queryKey: ['posts'] }, (data) =>
    mapPages(data, patch),
  )
  queryClient.setQueriesData<Post>({ queryKey: ['post'] }, (post) => post && patch(post))
}

const USER_LIST_KEYS = [['relations'], ['user-search'], ['post-likers']] as const

/** Apply an update to a user card wherever it is cached (lists, suggestions, profile). */
export function updateUserEverywhere(
  queryClient: QueryClient,
  username: string,
  update: <T extends UserCard>(user: T) => T,
) {
  const patch = <T extends UserCard>(user: T): T =>
    user.username === username ? update(user) : user
  for (const key of USER_LIST_KEYS) {
    queryClient.setQueriesData<InfiniteData<CursorPage<UserCard>>>({ queryKey: key }, (data) =>
      mapPages(data, patch),
    )
  }
  queryClient.setQueryData<UserCard[]>(['suggestions'], (users) => users?.map(patch))
  queryClient.setQueriesData<UserCard>(
    { queryKey: ['profile', username] },
    (user) => user && patch(user),
  )
}
