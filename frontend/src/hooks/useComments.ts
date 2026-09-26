import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { api, fetchPage } from '../lib/api'
import type { Comment, CountPage, LikeResponse } from '../lib/types'
import { mapPages, updatePostEverywhere } from './cache'

export function useComments(postId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['comments', postId],
    enabled,
    queryFn: ({ pageParam }) =>
      fetchPage<CountPage<Comment>>(pageParam ?? `/posts/${postId}/comments/`),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}

/** Apply an update to a comment (top-level or reply) inside a post's comment cache. */
function updateComment(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: number,
  commentId: number,
  update: (comment: Comment) => Comment,
) {
  const patch = (comment: Comment): Comment => {
    const next = comment.id === commentId ? update(comment) : comment
    return next.replies.length ? { ...next, replies: next.replies.map(patch) } : next
  }
  queryClient.setQueryData<InfiniteData<CountPage<Comment>>>(
    ['comments', postId],
    (data) => mapPages(data, patch) as InfiniteData<CountPage<Comment>> | undefined,
  )
}

export function useAddComment(postId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { content: string; parent?: number }) => {
      const { data } = await api.post<Comment>(`/posts/${postId}/comments/`, input)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      updatePostEverywhere(queryClient, postId, (post) => ({
        ...post,
        comments_count: post.comments_count + 1,
      }))
    },
  })
}

export function useUpdateComment(postId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const { data } = await api.patch<Comment>(`/comments/${id}/`, { content })
      return data
    },
    onSuccess: (comment) => {
      updateComment(queryClient, postId, comment.id, (current) => ({
        ...current,
        content: comment.content,
        updated_at: comment.updated_at,
        is_edited: comment.is_edited,
      }))
    },
  })
}

export function useDeleteComment(postId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: number) => {
      await api.delete(`/comments/${commentId}/`)
    },
    onSuccess: (_data, commentId) => {
      // A deleted top-level comment takes its replies with it.
      let removed = 1
      queryClient.setQueryData<InfiniteData<CountPage<Comment>>>(['comments', postId], (data) => {
        if (!data) return data
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            results: page.results
              .filter((comment) => {
                if (comment.id === commentId) {
                  removed += comment.replies.length
                  return false
                }
                return true
              })
              .map((comment) => ({
                ...comment,
                replies: comment.replies.filter((reply) => reply.id !== commentId),
              })),
          })),
        }
      })
      updatePostEverywhere(queryClient, postId, (post) => ({
        ...post,
        comments_count: Math.max(0, post.comments_count - removed),
      }))
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
  })
}

function toggleLike(comment: Comment): Comment {
  return {
    ...comment,
    is_liked: !comment.is_liked,
    likes_count: Math.max(0, comment.likes_count + (comment.is_liked ? -1 : 1)),
  }
}

export function useLikeComment(postId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: number) => {
      const { data } = await api.post<LikeResponse>(`/comments/${commentId}/like/`)
      return data
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] })
      updateComment(queryClient, postId, commentId, toggleLike)
    },
    onSuccess: (data, commentId) => {
      updateComment(queryClient, postId, commentId, (comment) => ({
        ...comment,
        is_liked: data.is_liked,
        likes_count: data.likes_count,
      }))
    },
    onError: (_error, commentId) => updateComment(queryClient, postId, commentId, toggleLike),
  })
}
