import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, fetchPage } from '../lib/api'
import type { CountPage, FollowResponse, Me, UserCard, UserDetail } from '../lib/types'
import { useAuthStore } from '../stores/auth'
import { updateUserEverywhere } from './cache'

export function useProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    enabled: username.length > 0,
    queryFn: async () => {
      const { data } = await api.get<UserDetail>(`/users/${encodeURIComponent(username)}/`)
      return data
    },
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } }).response?.status
      return status !== 404 && failureCount < 1
    },
  })
}

export function useSuggestions() {
  return useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const { data } = await api.get<UserCard[]>('/users/suggestions/')
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useSearchUsers(query: string) {
  return useInfiniteQuery({
    queryKey: ['user-search', query],
    enabled: query.trim().length > 0,
    queryFn: ({ pageParam }) =>
      fetchPage<CountPage<UserCard>>(pageParam ?? `/users/?search=${encodeURIComponent(query)}`),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}

export type Relation = 'followers' | 'following'

export function useRelationList(username: string, relation: Relation) {
  return useInfiniteQuery({
    queryKey: ['relations', username, relation],
    queryFn: ({ pageParam }) =>
      fetchPage<CountPage<UserCard>>(
        pageParam ?? `/users/${encodeURIComponent(username)}/${relation}/`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next,
  })
}

export function useFollow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ username, follow }: { username: string; follow: boolean }) => {
      const url = `/users/${encodeURIComponent(username)}/follow/`
      const { data } = follow
        ? await api.post<FollowResponse>(url)
        : await api.delete<FollowResponse>(url)
      return data
    },
    onMutate: async ({ username, follow }) => {
      await queryClient.cancelQueries({ queryKey: ['profile', username] })
      updateUserEverywhere(queryClient, username, (user) => ({
        ...user,
        is_following: follow,
        followers_count: Math.max(0, user.followers_count + (follow ? 1 : -1)),
      }))
      const me = useAuthStore.getState().user
      if (me) {
        useAuthStore
          .getState()
          .setUser({ ...me, following_count: Math.max(0, me.following_count + (follow ? 1 : -1)) })
      }
    },
    onSuccess: (data, { username }) => {
      updateUserEverywhere(queryClient, username, (user) => ({
        ...user,
        is_following: data.is_following,
        followers_count: data.followers_count,
      }))
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['posts', { feed: 'following' }] })
    },
    onError: (_error, { username, follow }) => {
      updateUserEverywhere(queryClient, username, (user) => ({
        ...user,
        is_following: !follow,
        followers_count: Math.max(0, user.followers_count + (follow ? -1 : 1)),
      }))
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export interface ProfileUpdateInput {
  first_name?: string
  last_name?: string
  headline?: string
  bio?: string
  location?: string
  website?: string
  avatar?: File | null
  cover?: File | null
  remove_avatar?: boolean
  remove_cover?: boolean
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProfileUpdateInput) => {
      const form = new FormData()
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined || value === null) continue
        if (typeof value === 'boolean') {
          if (value) form.append(key, 'true')
          continue
        }
        form.append(key, value)
      }
      const { data } = await api.patch<Me>('/users/me/', form)
      return data
    },
    onSuccess: (user) => {
      useAuthStore.getState().setUser(user)
      queryClient.setQueryData(['me'], user)
      queryClient.setQueryData(['profile', user.username], user)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
  })
}
