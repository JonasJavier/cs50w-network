import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, fetchPage } from '../lib/api'
import type {
  BookmarkResponse,
  CountPage,
  CursorPage,
  LikeResponse,
  Post,
  RepostResponse,
  UserCard,
} from '../lib/types'
import { updatePostEverywhere } from './cache'

export { updatePostEverywhere }

export interface FeedFilters {
  feed?: 'following'
  author?: string
  search?: string
  hashtag?: string
  liked_by?: string
  bookmarked?: boolean
  media?: boolean
}

export function feedPath(filters: FeedFilters): string {
  const params = new URLSearchParams()
  if (filters.feed) params.set('feed', filters.feed)
  if (filters.author) params.set('author', filters.author)
  if (filters.search) params.set('search', filters.search)
  if (filters.hashtag) params.set('hashtag', filters.hashtag)
  if (filters.liked_by) params.set('liked_by', filters.liked_by)
  if (filters.bookmarked) params.set('bookmarked', '1')
  if (filters.media) params.set('media', '1')
  const query = params.toString()
  return `/posts/${query ? `?${query}` : ''}`
}

export function usePostsFeed(filters: FeedFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['posts', filters],
    queryFn: ({ pageParam }) => fetchPage<CursorPage<Post>>(pageParam ?? feedPath(filters)),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}

export function usePost(id: number) {
  return useQuery({
    queryKey: ['post', id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => {
      const { data } = await api.get<Post>(`/posts/${id}/`)
      return data
    },
  })
}

export function usePostLikers(postId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['post-likers', postId],
    enabled,
    queryFn: ({ pageParam }) =>
      fetchPage<CountPage<UserCard>>(pageParam ?? `/posts/${postId}/likes/`),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}

export interface PostInput {
  content: string
  image?: File | null
  /** Quote this post (requires content or an image). */
  repost_of_id?: number
}

function postFormData({ content, image, repost_of_id }: PostInput): FormData {
  const form = new FormData()
  form.append('content', content)
  if (image) form.append('image', image)
  if (repost_of_id) form.append('repost_of_id', String(repost_of_id))
  return form
}

export function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: PostInput) => {
      const { data } = await api.post<Post>('/posts/', postFormData(input))
      return data
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['trending'] })
      if (post.repost_of) {
        updatePostEverywhere(queryClient, post.repost_of.id, (original) => ({
          ...original,
          reposts_count: original.reposts_count + 1,
        }))
      }
    },
  })
}

export function useUpdatePost(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { content: string }) => {
      const { data } = await api.patch<Post>(`/posts/${id}/`, input)
      return data
    },
    onSuccess: (post) => {
      updatePostEverywhere(queryClient, id, () => post)
      queryClient.invalidateQueries({ queryKey: ['trending'] })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/posts/${id}/`)
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['post', id] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

function toggleLike(post: Post): Post {
  return {
    ...post,
    is_liked: !post.is_liked,
    likes_count: Math.max(0, post.likes_count + (post.is_liked ? -1 : 1)),
  }
}

export function useLikePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<LikeResponse>(`/posts/${id}/like/`)
      return data
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      updatePostEverywhere(queryClient, id, toggleLike)
    },
    onSuccess: (data, id) => {
      updatePostEverywhere(queryClient, id, (post) => ({
        ...post,
        is_liked: data.is_liked,
        likes_count: data.likes_count,
      }))
      queryClient.invalidateQueries({ queryKey: ['post-likers', id] })
    },
    onError: (_error, id) => updatePostEverywhere(queryClient, id, toggleLike),
  })
}

function toggleRepost(post: Post): Post {
  return {
    ...post,
    is_reposted: !post.is_reposted,
    reposts_count: Math.max(0, post.reposts_count + (post.is_reposted ? -1 : 1)),
  }
}

export function useRepostPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<RepostResponse>(`/posts/${id}/repost/`)
      return data
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      updatePostEverywhere(queryClient, id, toggleRepost)
    },
    onSuccess: (data, id) => {
      updatePostEverywhere(queryClient, id, (post) => ({
        ...post,
        is_reposted: data.is_reposted,
        reposts_count: data.reposts_count,
      }))
      // the repost itself is a new feed row
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (_error, id) => updatePostEverywhere(queryClient, id, toggleRepost),
  })
}

function toggleBookmark(post: Post): Post {
  return { ...post, is_bookmarked: !post.is_bookmarked }
}

export function useBookmarkPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<BookmarkResponse>(`/posts/${id}/bookmark/`)
      return data
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] })
      updatePostEverywhere(queryClient, id, toggleBookmark)
    },
    onSuccess: (data, id) => {
      updatePostEverywhere(queryClient, id, (post) => ({
        ...post,
        is_bookmarked: data.is_bookmarked,
      }))
      queryClient.invalidateQueries({ queryKey: ['posts', { bookmarked: true }] })
    },
    onError: (_error, id) => updatePostEverywhere(queryClient, id, toggleBookmark),
  })
}
